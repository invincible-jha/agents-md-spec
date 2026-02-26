# SPDX-License-Identifier: MIT
# Copyright (c) 2026 MuVeraAI Corporation

"""
Tests for the AGENTS.md Python validator.
Mirrors the TypeScript validator test suite.
"""

import pytest

from agents_md import validate
from agents_md.types import (
    AgentIdentification,
    AgentsPolicy,
    DataHandling,
    IdentitySection,
    RateLimits,
    Restrictions,
    TrustRequirements,
)


def make_valid_policy(**kwargs: object) -> AgentsPolicy:
    base = AgentsPolicy(
        identity=IdentitySection(
            site="example.com",
            contact="ai@example.com",
            last_updated="2026-03-15",
        ),
        trust_requirements=TrustRequirements(
            minimum_trust_level=2,
            authentication="required",
            authentication_methods=["oauth2", "api-key"],
        ),
        allowed_actions={
            "read_content": True,
            "submit_forms": False,
            "make_purchases": False,
        },
        rate_limits=RateLimits(
            requests_per_minute=30,
            requests_per_hour=500,
            concurrent_sessions=3,
        ),
        data_handling=DataHandling(
            personal_data_collection="minimal",
            data_retention="session-only",
            third_party_sharing="none",
            gdpr_compliance=True,
        ),
        restrictions=Restrictions(
            disallowed_paths=["/admin/*"],
            require_human_approval=["/checkout/*"],
            read_only_paths=["/blog/*"],
        ),
        agent_identification=AgentIdentification(
            require_agent_header=True,
            agent_header_name="X-Agent-Identity",
            require_disclosure=True,
        ),
    )
    for key, value in kwargs.items():
        setattr(base, key, value)
    return base


# ---------------------------------------------------------------------------
# Valid policy
# ---------------------------------------------------------------------------


class TestValidPolicy:
    def test_returns_valid_for_fully_populated_policy(self) -> None:
        result = validate(make_valid_policy())
        assert result.valid is True
        assert len(result.errors) == 0

    def test_returns_valid_for_minimal_policy(self) -> None:
        policy = AgentsPolicy(
            identity=IdentitySection(site="example.com"),
            trust_requirements=TrustRequirements(minimum_trust_level=0, authentication="none"),
            allowed_actions={"read_content": True},
            rate_limits=RateLimits(),
            data_handling=DataHandling(),
            restrictions=Restrictions(),
            agent_identification=AgentIdentification(),
        )
        result = validate(policy)
        assert result.valid is True

    def test_returns_valid_for_trust_level_zero(self) -> None:
        result = validate(
            make_valid_policy(
                trust_requirements=TrustRequirements(
                    minimum_trust_level=0, authentication="none"
                )
            )
        )
        assert result.valid is True

    def test_returns_valid_for_trust_level_five(self) -> None:
        result = validate(
            make_valid_policy(
                trust_requirements=TrustRequirements(
                    minimum_trust_level=5, authentication="required"
                )
            )
        )
        assert result.valid is True


# ---------------------------------------------------------------------------
# Identity validation
# ---------------------------------------------------------------------------


class TestIdentityValidation:
    def test_returns_error_when_site_is_empty_string(self) -> None:
        result = validate(make_valid_policy(identity=IdentitySection(site="")))
        assert result.valid is False
        assert any("site" in e for e in result.errors)

    def test_returns_error_when_site_contains_protocol(self) -> None:
        result = validate(
            make_valid_policy(identity=IdentitySection(site="https://example.com"))
        )
        assert result.valid is False
        assert any("protocol" in e.lower() for e in result.errors)

    def test_returns_error_for_invalid_last_updated_format(self) -> None:
        result = validate(
            make_valid_policy(
                identity=IdentitySection(site="example.com", last_updated="March 15, 2026")
            )
        )
        assert result.valid is False
        assert any("last_updated" in e for e in result.errors)

    def test_returns_valid_for_iso_8601_datetime_with_timezone(self) -> None:
        result = validate(
            make_valid_policy(
                identity=IdentitySection(site="example.com", last_updated="2026-03-15T10:30:00Z")
            )
        )
        assert result.valid is True


# ---------------------------------------------------------------------------
# Trust Requirements validation
# ---------------------------------------------------------------------------


class TestTrustRequirementsValidation:
    def test_returns_error_when_trust_level_is_negative(self) -> None:
        result = validate(
            make_valid_policy(
                trust_requirements=TrustRequirements(
                    minimum_trust_level=-1, authentication="none"
                )
            )
        )
        assert result.valid is False
        assert any("minimum_trust_level" in e for e in result.errors)

    def test_returns_error_when_trust_level_exceeds_5(self) -> None:
        result = validate(
            make_valid_policy(
                trust_requirements=TrustRequirements(
                    minimum_trust_level=6, authentication="none"
                )
            )
        )
        assert result.valid is False
        assert any("minimum_trust_level" in e for e in result.errors)

    def test_returns_error_when_authentication_value_is_invalid(self) -> None:
        result = validate(
            make_valid_policy(
                trust_requirements=TrustRequirements(
                    minimum_trust_level=1,
                    authentication="maybe",  # type: ignore[arg-type]
                )
            )
        )
        assert result.valid is False
        assert any("authentication" in e for e in result.errors)


# ---------------------------------------------------------------------------
# Rate Limits validation
# ---------------------------------------------------------------------------


class TestRateLimitsValidation:
    def test_returns_error_when_requests_per_minute_is_negative(self) -> None:
        result = validate(
            make_valid_policy(rate_limits=RateLimits(requests_per_minute=-1))
        )
        assert result.valid is False

    def test_accepts_zero_as_valid_rate_limit(self) -> None:
        result = validate(
            make_valid_policy(
                rate_limits=RateLimits(requests_per_minute=0, requests_per_hour=0)
            )
        )
        assert result.valid is True

    def test_accepts_none_fields_for_rate_limits(self) -> None:
        result = validate(make_valid_policy(rate_limits=RateLimits()))
        assert result.valid is True


# ---------------------------------------------------------------------------
# Restrictions validation
# ---------------------------------------------------------------------------


class TestRestrictionsValidation:
    def test_returns_error_when_disallowed_path_lacks_leading_slash(self) -> None:
        result = validate(
            make_valid_policy(
                restrictions=Restrictions(
                    disallowed_paths=["admin/*"],
                    require_human_approval=[],
                    read_only_paths=[],
                )
            )
        )
        assert result.valid is False
        assert any("disallowed_paths" in e for e in result.errors)

    def test_accepts_valid_glob_path_patterns(self) -> None:
        result = validate(
            make_valid_policy(
                restrictions=Restrictions(
                    disallowed_paths=["/admin/*", "/internal/**"],
                    require_human_approval=["/checkout/confirm"],
                    read_only_paths=["/docs/**", "/blog/*"],
                )
            )
        )
        assert result.valid is True

    def test_returns_error_when_require_human_approval_path_lacks_slash(self) -> None:
        result = validate(
            make_valid_policy(
                restrictions=Restrictions(
                    disallowed_paths=[],
                    require_human_approval=["checkout/confirm"],
                    read_only_paths=[],
                )
            )
        )
        assert result.valid is False
