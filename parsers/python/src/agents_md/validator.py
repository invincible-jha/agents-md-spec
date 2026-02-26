# SPDX-License-Identifier: MIT
# Copyright (c) 2026 MuVeraAI Corporation

"""
Validates a parsed AgentsPolicy for semantic correctness.

Usage:
    from agents_md import validate

    result = validate(policy)
    if not result.valid:
        for error in result.errors:
            print(error)
"""

from __future__ import annotations

import re

from .types import AgentsPolicy, ValidationResult


def validate(policy: AgentsPolicy) -> ValidationResult:
    """
    Validate a parsed AgentsPolicy object for semantic correctness.

    This function checks that all fields are within their valid ranges
    and that required fields are present. It operates on already-parsed data.

    Args:
        policy: The AgentsPolicy to validate.

    Returns:
        A ValidationResult containing a boolean and a list of error messages.

    Example::

        parser = AgentsMdParser()
        parse_result = parser.parse(content)
        if parse_result.policy:
            validation = validate(parse_result.policy)
            if not validation.valid:
                print(validation.errors)
    """
    errors: list[str] = []

    # --- Identity section validation ---
    if policy.identity is None:
        errors.append("Identity section is missing.")
    else:
        if not policy.identity.site or not policy.identity.site.strip():
            errors.append("Identity.site is required and must not be empty.")
        else:
            if "://" in policy.identity.site:
                errors.append(
                    f'Identity.site "{policy.identity.site}" must be a domain name only '
                    "(without protocol, e.g., \"example.com\")."
                )
            if " " in policy.identity.site:
                errors.append(
                    f'Identity.site "{policy.identity.site}" must not contain spaces.'
                )

        if policy.identity.last_updated is not None:
            iso_date_pattern = re.compile(
                r"^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$"
            )
            if not iso_date_pattern.match(policy.identity.last_updated):
                errors.append(
                    f'Identity.last_updated "{policy.identity.last_updated}" '
                    "is not a valid ISO 8601 date."
                )

    # --- Trust requirements validation ---
    if policy.trust_requirements is not None:
        level = policy.trust_requirements.minimum_trust_level
        if not isinstance(level, int) or isinstance(level, bool) or level < 0 or level > 5:
            errors.append(
                f"TrustRequirements.minimum_trust_level must be an integer between 0 and 5. "
                f"Got: {level}."
            )

        valid_auth_values = ("required", "optional", "none")
        if policy.trust_requirements.authentication not in valid_auth_values:
            errors.append(
                f"TrustRequirements.authentication must be one of: "
                f"{', '.join(valid_auth_values)}. "
                f'Got: "{policy.trust_requirements.authentication}".'
            )

        if policy.trust_requirements.authentication_methods is not None:
            if not isinstance(policy.trust_requirements.authentication_methods, list):
                errors.append("TrustRequirements.authentication_methods must be a list.")
            else:
                for method in policy.trust_requirements.authentication_methods:
                    if not isinstance(method, str) or not method.strip():
                        errors.append(
                            "TrustRequirements.authentication_methods must contain "
                            "non-empty strings."
                        )
                        break

    # --- Rate limits validation ---
    if policy.rate_limits is not None:
        rate_limit_fields = [
            ("requests_per_minute", policy.rate_limits.requests_per_minute),
            ("requests_per_hour", policy.rate_limits.requests_per_hour),
            ("concurrent_sessions", policy.rate_limits.concurrent_sessions),
        ]
        for field_name, value in rate_limit_fields:
            if value is not None:
                if not isinstance(value, int) or isinstance(value, bool) or value < 0:
                    errors.append(
                        f"RateLimits.{field_name} must be a non-negative integer. "
                        f"Got: {value}."
                    )

    # --- Data handling validation ---
    if policy.data_handling is not None:
        valid_collection = ("none", "minimal", "standard", "extensive")
        if (
            policy.data_handling.personal_data_collection is not None
            and policy.data_handling.personal_data_collection not in valid_collection
        ):
            errors.append(
                f"DataHandling.personal_data_collection must be one of: "
                f"{', '.join(valid_collection)}."
            )

        valid_retention = ("none", "session-only", "30-days", "1-year", "indefinite")
        if (
            policy.data_handling.data_retention is not None
            and policy.data_handling.data_retention not in valid_retention
        ):
            errors.append(
                f"DataHandling.data_retention must be one of: "
                f"{', '.join(valid_retention)}."
            )

        valid_sharing = ("none", "anonymized", "with-consent", "unrestricted")
        if (
            policy.data_handling.third_party_sharing is not None
            and policy.data_handling.third_party_sharing not in valid_sharing
        ):
            errors.append(
                f"DataHandling.third_party_sharing must be one of: "
                f"{', '.join(valid_sharing)}."
            )

        if (
            policy.data_handling.gdpr_compliance is not None
            and not isinstance(policy.data_handling.gdpr_compliance, bool)
        ):
            errors.append("DataHandling.gdpr_compliance must be a boolean.")

    # --- Restrictions validation ---
    if policy.restrictions is not None:
        path_array_fields = [
            ("disallowed_paths", policy.restrictions.disallowed_paths),
            ("require_human_approval", policy.restrictions.require_human_approval),
            ("read_only_paths", policy.restrictions.read_only_paths),
        ]
        for field_name, paths in path_array_fields:
            if not isinstance(paths, list):
                errors.append(f"Restrictions.{field_name} must be a list.")
                continue

            for path in paths:
                if not isinstance(path, str):
                    errors.append(f"Restrictions.{field_name} must contain strings.")
                    break
                if not path.startswith("/"):
                    errors.append(
                        f'Restrictions.{field_name} path "{path}" must start with "/".'
                    )

    # --- Agent identification validation ---
    if policy.agent_identification is not None:
        if not isinstance(policy.agent_identification.require_agent_header, bool):
            errors.append("AgentIdentification.require_agent_header must be a boolean.")
        if not isinstance(policy.agent_identification.require_disclosure, bool):
            errors.append("AgentIdentification.require_disclosure must be a boolean.")
        if policy.agent_identification.agent_header_name is not None:
            if (
                not isinstance(policy.agent_identification.agent_header_name, str)
                or not policy.agent_identification.agent_header_name.strip()
            ):
                errors.append(
                    "AgentIdentification.agent_header_name must be a non-empty string "
                    "if specified."
                )

    return ValidationResult(valid=len(errors) == 0, errors=errors)
