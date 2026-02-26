# SPDX-License-Identifier: MIT
# Copyright (c) 2026 MuVeraAI Corporation

"""
AGENTS.md parser — converts raw AGENTS.md file content into an AgentsPolicy.

Usage:
    from agents_md import AgentsMdParser

    parser = AgentsMdParser()
    result = parser.parse(file_content)
    if result.success and result.policy:
        print(result.policy.identity.site)
"""

from __future__ import annotations

import re
from typing import Literal

from .types import (
    AgentIdentification,
    AgentsPolicy,
    DataHandling,
    IdentitySection,
    ParseError,
    ParseResult,
    ParseWarning,
    RateLimits,
    Restrictions,
    TrustRequirements,
)

# Type aliases used internally.
SectionData = dict[str, str]

# Keys for the Allowed Actions section (markdown key -> Python attribute name).
_ACTION_KEY_MAP: dict[str, str] = {
    "read-content": "read_content",
    "submit-forms": "submit_forms",
    "make-purchases": "make_purchases",
    "modify-account": "modify_account",
    "access-api": "access_api",
    "download-files": "download_files",
    "upload-files": "upload_files",
    "send-messages": "send_messages",
    "delete-data": "delete_data",
    "create-content": "create_content",
}

_DEFAULT_ALLOWED_ACTIONS: dict[str, bool] = {
    "read_content": True,
    "submit_forms": False,
    "make_purchases": False,
    "modify_account": False,
    "access_api": False,
    "download_files": False,
    "upload_files": False,
    "send_messages": False,
    "delete_data": False,
    "create_content": False,
}


class AgentsMdParser:
    """
    Parses AGENTS.md content into a structured AgentsPolicy.

    This parser is stateless — each call to ``parse()`` is independent.
    """

    def parse(self, content: str) -> ParseResult:
        """
        Parse the raw string content of an AGENTS.md file.

        Args:
            content: The raw UTF-8 string content of the AGENTS.md file.

        Returns:
            A ParseResult containing the policy (on success), errors, and warnings.
        """
        errors: list[ParseError] = []
        warnings: list[ParseWarning] = []

        if not content or not content.strip():
            return ParseResult(
                success=False,
                errors=[ParseError(section="file", message="File is empty.")],
            )

        sections = self._extract_sections(content)

        if "identity" not in sections:
            return ParseResult(
                success=False,
                errors=[
                    ParseError(
                        section="identity",
                        message=(
                            "Missing required ## Identity section. "
                            "An AGENTS.md file must contain an Identity section."
                        ),
                    )
                ],
            )

        identity = self._parse_identity_section(sections["identity"], warnings)
        if identity is None:
            return ParseResult(
                success=False,
                errors=[
                    ParseError(
                        section="identity",
                        message='The Identity section is missing the required "site" key.',
                    )
                ],
                warnings=warnings,
            )

        trust_requirements = self._parse_trust_requirements(
            sections.get("trust requirements"), warnings
        )
        allowed_actions = self._parse_allowed_actions(
            sections.get("allowed actions"), warnings
        )
        rate_limits = self._parse_rate_limits(sections.get("rate limits"), warnings)
        data_handling = self._parse_data_handling(sections.get("data handling"), warnings)
        restrictions = self._parse_restrictions(sections.get("restrictions"), warnings)
        agent_identification = self._parse_agent_identification(
            sections.get("agent identification"), warnings
        )

        policy = AgentsPolicy(
            identity=identity,
            trust_requirements=trust_requirements,
            allowed_actions=allowed_actions,
            rate_limits=rate_limits,
            data_handling=data_handling,
            restrictions=restrictions,
            agent_identification=agent_identification,
        )

        return ParseResult(
            success=len(errors) == 0,
            policy=policy,
            errors=errors,
            warnings=warnings,
        )

    # ------------------------------------------------------------------
    # Section extraction
    # ------------------------------------------------------------------

    def _extract_sections(self, content: str) -> dict[str, SectionData]:
        """
        Split the file content into named sections by level-2 Markdown headings.
        Section names are normalized to lowercase.
        """
        result: dict[str, SectionData] = {}
        current_section_name: str | None = None
        current_lines: list[str] = []

        def flush() -> None:
            if current_section_name is not None:
                result[current_section_name] = self._parse_key_value_lines(current_lines)

        for line in re.split(r"\r?\n", content):
            section_match = re.match(r"^##\s+(.+)$", line)
            if section_match:
                flush()
                current_section_name = section_match.group(1).strip().lower()
                current_lines = []
                continue

            if current_section_name is not None:
                current_lines.append(line)

        flush()
        return result

    def _parse_key_value_lines(self, lines: list[str]) -> SectionData:
        """
        Parse the lines within a section body into a key-value dict.
        Only lines beginning with "- " are treated as directives.
        Keys are normalized to lowercase and stripped.
        Values are stripped.
        """
        data: SectionData = {}
        for line in lines:
            trimmed = line.strip()
            if not trimmed or trimmed.startswith("#"):
                continue
            if not trimmed.startswith("- "):
                continue

            without_bullet = trimmed[2:]
            colon_index = without_bullet.find(":")
            if colon_index == -1:
                continue

            key = without_bullet[:colon_index].strip().lower()
            value = without_bullet[colon_index + 1 :].strip()

            if key:
                data[key] = value

        return data

    # ------------------------------------------------------------------
    # Value coercion helpers
    # ------------------------------------------------------------------

    def _parse_bool(
        self,
        raw: str,
        section: str,
        key: str,
        warnings: list[ParseWarning],
    ) -> bool | None:
        """Convert a raw string to a boolean. Returns None and appends a warning on failure."""
        normalized = raw.lower().strip()
        if normalized in ("true", "yes", "1", "on"):
            return True
        if normalized in ("false", "no", "0", "off"):
            return False
        warnings.append(
            ParseWarning(
                section=section,
                message=(
                    f'Unrecognized boolean value "{raw}" for key "{key}". '
                    "Expected: true/false/yes/no/1/0/on/off."
                ),
            )
        )
        return None

    def _parse_int(
        self,
        raw: str,
        section: str,
        key: str,
        warnings: list[ParseWarning],
    ) -> int | None:
        """Convert a raw string to an integer. Returns None and appends a warning on failure."""
        try:
            return int(raw.strip())
        except ValueError:
            warnings.append(
                ParseWarning(
                    section=section,
                    message=f'Invalid integer value "{raw}" for key "{key}".',
                )
            )
            return None

    @staticmethod
    def _parse_array(raw: str) -> list[str]:
        """Convert a comma-separated string to a list of trimmed non-empty strings."""
        return [item.strip() for item in raw.split(",") if item.strip()]

    @staticmethod
    def _kebab_to_snake(kebab: str) -> str:
        """Convert a kebab-case string to snake_case."""
        return kebab.replace("-", "_")

    # ------------------------------------------------------------------
    # Section parsers
    # ------------------------------------------------------------------

    def _parse_identity_section(
        self,
        data: SectionData,
        warnings: list[ParseWarning],
    ) -> IdentitySection | None:
        """Parse the Identity section. Returns None if the required 'site' key is absent."""
        site = data.get("site", "").strip()
        if not site:
            return None

        identity = IdentitySection(site=site)

        if contact := data.get("contact"):
            identity.contact = contact
        if last_updated := data.get("last-updated"):
            identity.last_updated = last_updated
        if spec_version := data.get("spec-version"):
            identity.spec_version = spec_version

        known_keys = {"site", "contact", "last-updated", "spec-version"}
        for key in data:
            if key not in known_keys and not key.startswith("x-"):
                warnings.append(
                    ParseWarning(
                        section="identity",
                        message=f'Unrecognized key "{key}" in Identity section.',
                    )
                )

        return identity

    def _parse_trust_requirements(
        self,
        data: SectionData | None,
        warnings: list[ParseWarning],
    ) -> TrustRequirements:
        """Parse the Trust Requirements section. Returns defaults when section is absent."""
        if data is None:
            return TrustRequirements()

        result = TrustRequirements()

        if (raw_level := data.get("minimum-trust-level")) is not None:
            level = self._parse_int(raw_level, "trust requirements", "minimum-trust-level", warnings)
            if level is not None:
                if level < 0 or level > 5:
                    warnings.append(
                        ParseWarning(
                            section="trust requirements",
                            message=(
                                f"Trust level {level} is outside the valid 0-5 range. "
                                "Clamping to nearest valid value."
                            ),
                        )
                    )
                    result.minimum_trust_level = max(0, min(5, level))
                else:
                    result.minimum_trust_level = level

        if (raw_auth := data.get("authentication")) is not None:
            normalized = raw_auth.lower().strip()
            if normalized in ("required", "optional", "none"):
                result.authentication = normalized  # type: ignore[assignment]
            else:
                warnings.append(
                    ParseWarning(
                        section="trust requirements",
                        message=(
                            f'Unrecognized authentication value "{raw_auth}". '
                            "Expected: required/optional/none."
                        ),
                    )
                )

        if (raw_methods := data.get("authentication-methods")) is not None:
            result.authentication_methods = self._parse_array(raw_methods)

        return result

    def _parse_allowed_actions(
        self,
        data: SectionData | None,
        warnings: list[ParseWarning],
    ) -> dict[str, bool]:
        """Parse the Allowed Actions section. Returns defaults when section is absent."""
        result = dict(_DEFAULT_ALLOWED_ACTIONS)

        if data is None:
            return result

        for raw_key, raw_value in data.items():
            snake_key = _ACTION_KEY_MAP.get(raw_key, self._kebab_to_snake(raw_key))
            bool_value = self._parse_bool(raw_value, "allowed actions", raw_key, warnings)
            if bool_value is not None:
                result[snake_key] = bool_value

        return result

    def _parse_rate_limits(
        self,
        data: SectionData | None,
        warnings: list[ParseWarning],
    ) -> RateLimits:
        """Parse the Rate Limits section. Returns empty RateLimits when section is absent."""
        if data is None:
            return RateLimits()

        result = RateLimits()

        if (raw := data.get("requests-per-minute")) is not None:
            result.requests_per_minute = self._parse_int(
                raw, "rate limits", "requests-per-minute", warnings
            )

        if (raw := data.get("requests-per-hour")) is not None:
            result.requests_per_hour = self._parse_int(
                raw, "rate limits", "requests-per-hour", warnings
            )

        if (raw := data.get("concurrent-sessions")) is not None:
            result.concurrent_sessions = self._parse_int(
                raw, "rate limits", "concurrent-sessions", warnings
            )

        return result

    def _parse_data_handling(
        self,
        data: SectionData | None,
        warnings: list[ParseWarning],
    ) -> DataHandling:
        """Parse the Data Handling section. Returns empty DataHandling when section is absent."""
        if data is None:
            return DataHandling()

        result = DataHandling()

        valid_collection = ("none", "minimal", "standard", "extensive")
        if (raw := data.get("personal-data-collection")) is not None:
            normalized = raw.lower().strip()
            if normalized in valid_collection:
                result.personal_data_collection = normalized  # type: ignore[assignment]
            else:
                warnings.append(
                    ParseWarning(
                        section="data handling",
                        message=(
                            f'Unrecognized personal-data-collection value "{raw}". '
                            f"Expected: {'/'.join(valid_collection)}."
                        ),
                    )
                )

        valid_retention = ("none", "session-only", "30-days", "1-year", "indefinite")
        if (raw := data.get("data-retention")) is not None:
            normalized = raw.lower().strip()
            if normalized in valid_retention:
                result.data_retention = normalized  # type: ignore[assignment]
            else:
                warnings.append(
                    ParseWarning(
                        section="data handling",
                        message=(
                            f'Unrecognized data-retention value "{raw}". '
                            f"Expected: {'/'.join(valid_retention)}."
                        ),
                    )
                )

        valid_sharing = ("none", "anonymized", "with-consent", "unrestricted")
        if (raw := data.get("third-party-sharing")) is not None:
            normalized = raw.lower().strip()
            if normalized in valid_sharing:
                result.third_party_sharing = normalized  # type: ignore[assignment]
            else:
                warnings.append(
                    ParseWarning(
                        section="data handling",
                        message=(
                            f'Unrecognized third-party-sharing value "{raw}". '
                            f"Expected: {'/'.join(valid_sharing)}."
                        ),
                    )
                )

        if (raw := data.get("gdpr-compliance")) is not None:
            value = self._parse_bool(raw, "data handling", "gdpr-compliance", warnings)
            if value is not None:
                result.gdpr_compliance = value

        return result

    def _parse_restrictions(
        self,
        data: SectionData | None,
        warnings: list[ParseWarning],
    ) -> Restrictions:
        """Parse the Restrictions section. Returns empty lists when section is absent."""
        if data is None:
            return Restrictions()

        def parse_paths(raw: str | None) -> list[str]:
            if raw is None:
                return []
            return self._parse_array(raw)

        restrictions = Restrictions(
            disallowed_paths=parse_paths(data.get("disallowed-paths")),
            require_human_approval=parse_paths(data.get("require-human-approval")),
            read_only_paths=parse_paths(data.get("read-only-paths")),
        )

        all_paths = (
            restrictions.disallowed_paths
            + restrictions.require_human_approval
            + restrictions.read_only_paths
        )
        for path in all_paths:
            if not path.startswith("/"):
                warnings.append(
                    ParseWarning(
                        section="restrictions",
                        message=(
                            f'Path pattern "{path}" does not start with "/". '
                            "Path patterns should be absolute paths."
                        ),
                    )
                )

        return restrictions

    def _parse_agent_identification(
        self,
        data: SectionData | None,
        warnings: list[ParseWarning],
    ) -> AgentIdentification:
        """Parse the Agent Identification section. Returns permissive defaults when absent."""
        if data is None:
            return AgentIdentification()

        result = AgentIdentification()

        if (raw := data.get("require-agent-header")) is not None:
            value = self._parse_bool(raw, "agent identification", "require-agent-header", warnings)
            if value is not None:
                result.require_agent_header = value

        if header_name := data.get("agent-header-name"):
            result.agent_header_name = header_name

        if (raw := data.get("require-disclosure")) is not None:
            value = self._parse_bool(raw, "agent identification", "require-disclosure", warnings)
            if value is not None:
                result.require_disclosure = value

        return result
