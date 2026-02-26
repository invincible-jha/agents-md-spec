# SPDX-License-Identifier: MIT
# Copyright (c) 2026 MuVeraAI Corporation

"""
agents-md — Python parser for the AGENTS.md specification.

AGENTS.md is a machine-readable file that website operators place at the root
of their web property to declare their interaction policies for AI agents.
It is analogous to robots.txt but designed for autonomous AI agents that
perform actions, not just read content.

Specification: AGENTS-MD-SPEC-001
License: MIT (this package), CC BY-SA 4.0 (the specification)

Basic usage::

    from agents_md import AgentsMdParser, validate

    parser = AgentsMdParser()
    result = parser.parse(file_content)
    if result.success and result.policy:
        validation = validate(result.policy)
        print(validation.valid)

Async fetching (requires ``aiohttp``)::

    from agents_md import fetch_policy

    result = await fetch_policy("https://example.com")
    if result and result.success and result.policy:
        print(result.policy.identity.site)
"""

from .fetcher import FetchPolicyError, fetch_policy
from .parser import AgentsMdParser
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
    ValidationResult,
)
from .validator import validate

__all__ = [
    # Parser
    "AgentsMdParser",
    # Validator
    "validate",
    # Fetcher
    "fetch_policy",
    "FetchPolicyError",
    # Types
    "AgentIdentification",
    "AgentsPolicy",
    "DataHandling",
    "IdentitySection",
    "ParseError",
    "ParseResult",
    "ParseWarning",
    "RateLimits",
    "Restrictions",
    "TrustRequirements",
    "ValidationResult",
]

__version__ = "0.1.0"
