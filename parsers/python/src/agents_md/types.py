# SPDX-License-Identifier: MIT
# Copyright (c) 2026 MuVeraAI Corporation

"""
Type definitions for the agents-md Python parser.

These types mirror the TypeScript types defined in the TypeScript parser
and correspond to the structure defined in AGENTS-MD-SPEC-001.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


@dataclass
class IdentitySection:
    """
    Declares the identity and contact information for the web property.
    This section is REQUIRED in a valid AGENTS.md file.
    """

    site: str
    """The domain name of the web property (without protocol)."""

    contact: str | None = None
    """Email address for AI policy inquiries."""

    last_updated: str | None = None
    """ISO 8601 date when the policy was last updated."""

    spec_version: str | None = None
    """Version of AGENTS-MD-SPEC this file targets."""


@dataclass
class TrustRequirements:
    """
    Trust requirements — declares minimum trust level and authentication requirements.
    Uses a generic 0-5 numeric scale; 0 = anonymous, 5 = administrative.
    """

    minimum_trust_level: int = 0
    """
    Minimum trust level required on a 0-5 generic scale.
    0 = Anonymous, 1 = Identified, 2 = Verified,
    3 = Authorized, 4 = Privileged, 5 = Administrative.
    """

    authentication: Literal["required", "optional", "none"] = "none"
    """Whether authentication is required, optional, or not needed."""

    authentication_methods: list[str] = field(default_factory=list)
    """Accepted authentication methods."""


@dataclass
class RateLimits:
    """Rate limits — declares the rate limits agents are expected to observe."""

    requests_per_minute: int | None = None
    """Maximum requests per minute."""

    requests_per_hour: int | None = None
    """Maximum requests per hour."""

    concurrent_sessions: int | None = None
    """Maximum number of concurrent sessions."""


PersonalDataCollection = Literal["none", "minimal", "standard", "extensive"]
DataRetention = Literal["none", "session-only", "30-days", "1-year", "indefinite"]
ThirdPartySharing = Literal["none", "anonymized", "with-consent", "unrestricted"]


@dataclass
class DataHandling:
    """Data handling — declares the operator's data handling commitments."""

    personal_data_collection: PersonalDataCollection | None = None
    """Level of personal data collected from agent interactions."""

    data_retention: DataRetention | None = None
    """How long interaction data is retained."""

    third_party_sharing: ThirdPartySharing | None = None
    """Whether and how interaction data is shared with third parties."""

    gdpr_compliance: bool | None = None
    """Whether the site operates in compliance with GDPR."""


@dataclass
class Restrictions:
    """Restrictions — path-level restrictions on agent access."""

    disallowed_paths: list[str] = field(default_factory=list)
    """Paths agents MUST NOT access."""

    require_human_approval: list[str] = field(default_factory=list)
    """Paths requiring explicit human approval before agent action."""

    read_only_paths: list[str] = field(default_factory=list)
    """Paths where only read operations are permitted."""


@dataclass
class AgentIdentification:
    """Agent identification — requirements for agent self-identification."""

    require_agent_header: bool = False
    """Whether the agent must send an identifying HTTP header."""

    agent_header_name: str | None = None
    """The HTTP header name to use for agent identification."""

    require_disclosure: bool = False
    """Whether the agent must disclose its AI nature to users."""


@dataclass
class AgentsPolicy:
    """
    The complete parsed AGENTS.md policy.
    Only the `identity` field is guaranteed to be present in a valid policy.
    """

    identity: IdentitySection
    """Identity section — always present in a valid policy."""

    trust_requirements: TrustRequirements = field(default_factory=TrustRequirements)
    """Trust requirements. Defaults applied when section is absent."""

    allowed_actions: dict[str, bool] = field(default_factory=dict)
    """
    Allowed actions map. Keys use snake_case versions of the markdown keys
    (e.g., read_content, submit_forms).
    """

    rate_limits: RateLimits = field(default_factory=RateLimits)
    """Rate limits. Fields are None when not specified."""

    data_handling: DataHandling = field(default_factory=DataHandling)
    """Data handling commitments."""

    restrictions: Restrictions = field(default_factory=Restrictions)
    """Path-level restrictions. Arrays are empty when not specified."""

    agent_identification: AgentIdentification = field(default_factory=AgentIdentification)
    """Agent identification requirements."""


@dataclass
class ParseError:
    """
    A parse error indicates a structural problem that prevents the policy
    from being considered valid (e.g., missing required Identity section).
    """

    section: str
    """The section name where the error occurred."""

    message: str
    """Human-readable error message."""

    line: int | None = None
    """Line number where the error occurred, if applicable."""


@dataclass
class ParseWarning:
    """
    A parse warning indicates a recoverable issue. The parser continues
    and uses defaults when warnings are encountered.
    """

    section: str
    """The section name where the warning occurred."""

    message: str
    """Human-readable warning message."""


@dataclass
class ParseResult:
    """
    The result of parsing an AGENTS.md file.
    When `success` is True, `policy` is guaranteed to be present.
    """

    success: bool
    """Whether the parse produced a usable policy."""

    errors: list[ParseError] = field(default_factory=list)
    """Errors that caused parsing to fail or produce an invalid result."""

    warnings: list[ParseWarning] = field(default_factory=list)
    """Warnings about recoverable issues encountered during parsing."""

    policy: AgentsPolicy | None = None
    """The parsed policy. Present when `success` is True."""


@dataclass
class ValidationResult:
    """The result of validating an AgentsPolicy object."""

    valid: bool
    """Whether the policy passed all validation checks."""

    errors: list[str] = field(default_factory=list)
    """Human-readable descriptions of validation failures."""
