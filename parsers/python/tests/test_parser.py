# SPDX-License-Identifier: MIT
# Copyright (c) 2026 MuVeraAI Corporation

"""
Tests for the AGENTS.md Python parser.
Mirrors the TypeScript parser test suite.
"""

import pytest

from agents_md import AgentsMdParser


parser = AgentsMdParser()


def make_minimal_file(extra: str = "") -> str:
    return f"# AGENTS.md\n\n## Identity\n- site: example.com\n{extra}"


# ---------------------------------------------------------------------------
# Basic parsing
# ---------------------------------------------------------------------------


class TestBasicParsing:
    def test_parses_minimal_valid_file(self) -> None:
        result = parser.parse(make_minimal_file())
        assert result.success is True
        assert len(result.errors) == 0
        assert result.policy is not None
        assert result.policy.identity.site == "example.com"

    def test_returns_failure_for_empty_string(self) -> None:
        result = parser.parse("")
        assert result.success is False
        assert len(result.errors) > 0

    def test_returns_failure_for_whitespace_only(self) -> None:
        result = parser.parse("   \n\n  \t  ")
        assert result.success is False

    def test_returns_failure_when_identity_section_missing(self) -> None:
        content = "# AGENTS.md\n\n## Trust Requirements\n- minimum-trust-level: 2\n"
        result = parser.parse(content)
        assert result.success is False
        assert result.errors[0].section == "identity"

    def test_returns_failure_when_site_key_missing(self) -> None:
        content = "# AGENTS.md\n\n## Identity\n- contact: admin@example.com\n"
        result = parser.parse(content)
        assert result.success is False


# ---------------------------------------------------------------------------
# Identity section
# ---------------------------------------------------------------------------


class TestIdentitySection:
    def test_parses_all_identity_fields(self) -> None:
        content = """# AGENTS.md

## Identity
- site: example.com
- contact: ai@example.com
- last-updated: 2026-03-15
- spec-version: 1.0.0
"""
        result = parser.parse(content)
        assert result.success is True
        assert result.policy is not None
        identity = result.policy.identity
        assert identity.site == "example.com"
        assert identity.contact == "ai@example.com"
        assert identity.last_updated == "2026-03-15"
        assert identity.spec_version == "1.0.0"

    def test_trims_whitespace_from_site_values(self) -> None:
        content = "# AGENTS.md\n\n## Identity\n-   site:   example.com   \n"
        result = parser.parse(content)
        assert result.policy is not None
        assert result.policy.identity.site == "example.com"

    def test_ignores_comment_lines_within_section(self) -> None:
        content = "# AGENTS.md\n\n## Identity\n# this is a comment\n- site: example.com\n"
        result = parser.parse(content)
        assert result.success is True
        assert result.policy is not None
        assert result.policy.identity.site == "example.com"

    def test_warns_about_unknown_keys(self) -> None:
        content = "# AGENTS.md\n\n## Identity\n- site: example.com\n- unknown-key: value\n"
        result = parser.parse(content)
        assert any("unknown-key" in w.message for w in result.warnings)

    def test_does_not_warn_about_x_prefixed_keys(self) -> None:
        content = "# AGENTS.md\n\n## Identity\n- site: example.com\n- x-custom-key: value\n"
        result = parser.parse(content)
        assert not any("x-custom-key" in w.message for w in result.warnings)


# ---------------------------------------------------------------------------
# Trust Requirements section
# ---------------------------------------------------------------------------


class TestTrustRequirements:
    def test_applies_defaults_when_section_absent(self) -> None:
        result = parser.parse(make_minimal_file())
        assert result.policy is not None
        assert result.policy.trust_requirements.minimum_trust_level == 0
        assert result.policy.trust_requirements.authentication == "none"

    def test_parses_all_trust_requirements_fields(self) -> None:
        content = make_minimal_file("""
## Trust Requirements
- minimum-trust-level: 3
- authentication: required
- authentication-methods: oauth2, api-key, bearer
""")
        result = parser.parse(content)
        assert result.policy is not None
        tr = result.policy.trust_requirements
        assert tr.minimum_trust_level == 3
        assert tr.authentication == "required"
        assert tr.authentication_methods == ["oauth2", "api-key", "bearer"]

    def test_warns_and_clamps_trust_level_above_5(self) -> None:
        content = make_minimal_file("\n## Trust Requirements\n- minimum-trust-level: 7\n")
        result = parser.parse(content)
        assert any("Trust level" in w.message for w in result.warnings)
        assert result.policy is not None
        assert result.policy.trust_requirements.minimum_trust_level <= 5

    def test_warns_about_invalid_authentication_values(self) -> None:
        content = make_minimal_file("\n## Trust Requirements\n- authentication: maybe\n")
        result = parser.parse(content)
        assert any("authentication" in w.message for w in result.warnings)


# ---------------------------------------------------------------------------
# Allowed Actions section
# ---------------------------------------------------------------------------


class TestAllowedActions:
    def test_applies_defaults_when_section_absent(self) -> None:
        result = parser.parse(make_minimal_file())
        assert result.policy is not None
        assert result.policy.allowed_actions.get("read_content") is True
        assert result.policy.allowed_actions.get("submit_forms") is False
        assert result.policy.allowed_actions.get("make_purchases") is False

    def test_parses_all_boolean_action_values(self) -> None:
        content = make_minimal_file("""
## Allowed Actions
- read-content: true
- submit-forms: false
- make-purchases: yes
- modify-account: no
- access-api: 1
- download-files: 0
""")
        result = parser.parse(content)
        assert result.policy is not None
        actions = result.policy.allowed_actions
        assert actions["read_content"] is True
        assert actions["submit_forms"] is False
        assert actions["make_purchases"] is True
        assert actions["modify_account"] is False
        assert actions["access_api"] is True
        assert actions["download_files"] is False

    def test_converts_kebab_to_snake_for_action_keys(self) -> None:
        content = make_minimal_file("\n## Allowed Actions\n- send-messages: true\n")
        result = parser.parse(content)
        assert result.policy is not None
        assert result.policy.allowed_actions.get("send_messages") is True

    def test_warns_on_unrecognized_boolean_values(self) -> None:
        content = make_minimal_file("\n## Allowed Actions\n- read-content: maybe\n")
        result = parser.parse(content)
        assert any('"maybe"' in w.message for w in result.warnings)


# ---------------------------------------------------------------------------
# Rate Limits section
# ---------------------------------------------------------------------------


class TestRateLimits:
    def test_returns_empty_rate_limits_when_section_absent(self) -> None:
        result = parser.parse(make_minimal_file())
        assert result.policy is not None
        rl = result.policy.rate_limits
        assert rl.requests_per_minute is None
        assert rl.requests_per_hour is None
        assert rl.concurrent_sessions is None

    def test_parses_all_rate_limit_fields(self) -> None:
        content = make_minimal_file("""
## Rate Limits
- requests-per-minute: 30
- requests-per-hour: 500
- concurrent-sessions: 3
""")
        result = parser.parse(content)
        assert result.policy is not None
        rl = result.policy.rate_limits
        assert rl.requests_per_minute == 30
        assert rl.requests_per_hour == 500
        assert rl.concurrent_sessions == 3

    def test_warns_and_omits_non_integer_rate_limit_values(self) -> None:
        content = make_minimal_file("\n## Rate Limits\n- requests-per-minute: fast\n")
        result = parser.parse(content)
        assert any('"fast"' in w.message for w in result.warnings)
        assert result.policy is not None
        assert result.policy.rate_limits.requests_per_minute is None


# ---------------------------------------------------------------------------
# Data Handling section
# ---------------------------------------------------------------------------


class TestDataHandling:
    def test_returns_empty_data_handling_when_section_absent(self) -> None:
        result = parser.parse(make_minimal_file())
        assert result.policy is not None
        dh = result.policy.data_handling
        assert dh.personal_data_collection is None
        assert dh.data_retention is None
        assert dh.third_party_sharing is None
        assert dh.gdpr_compliance is None

    def test_parses_all_data_handling_fields(self) -> None:
        content = make_minimal_file("""
## Data Handling
- personal-data-collection: minimal
- data-retention: session-only
- third-party-sharing: none
- gdpr-compliance: true
""")
        result = parser.parse(content)
        assert result.policy is not None
        dh = result.policy.data_handling
        assert dh.personal_data_collection == "minimal"
        assert dh.data_retention == "session-only"
        assert dh.third_party_sharing == "none"
        assert dh.gdpr_compliance is True

    def test_warns_on_invalid_enum_value(self) -> None:
        content = make_minimal_file(
            "\n## Data Handling\n- personal-data-collection: extreme\n"
        )
        result = parser.parse(content)
        assert any('"extreme"' in w.message for w in result.warnings)
        assert result.policy is not None
        assert result.policy.data_handling.personal_data_collection is None


# ---------------------------------------------------------------------------
# Restrictions section
# ---------------------------------------------------------------------------


class TestRestrictions:
    def test_returns_empty_lists_when_section_absent(self) -> None:
        result = parser.parse(make_minimal_file())
        assert result.policy is not None
        r = result.policy.restrictions
        assert r.disallowed_paths == []
        assert r.require_human_approval == []
        assert r.read_only_paths == []

    def test_parses_comma_separated_path_arrays(self) -> None:
        content = make_minimal_file("""
## Restrictions
- disallowed-paths: /admin/*, /internal/*
- require-human-approval: /checkout/*, /account/delete
- read-only-paths: /blog/*, /docs/**
""")
        result = parser.parse(content)
        assert result.policy is not None
        r = result.policy.restrictions
        assert r.disallowed_paths == ["/admin/*", "/internal/*"]
        assert r.require_human_approval == ["/checkout/*", "/account/delete"]
        assert r.read_only_paths == ["/blog/*", "/docs/**"]

    def test_warns_about_paths_without_leading_slash(self) -> None:
        content = make_minimal_file(
            "\n## Restrictions\n- disallowed-paths: admin/*, internal\n"
        )
        result = parser.parse(content)
        assert any(w.section == "restrictions" for w in result.warnings)


# ---------------------------------------------------------------------------
# Agent Identification section
# ---------------------------------------------------------------------------


class TestAgentIdentification:
    def test_applies_permissive_defaults_when_section_absent(self) -> None:
        result = parser.parse(make_minimal_file())
        assert result.policy is not None
        ai = result.policy.agent_identification
        assert ai.require_agent_header is False
        assert ai.require_disclosure is False
        assert ai.agent_header_name is None

    def test_parses_all_agent_identification_fields(self) -> None:
        content = make_minimal_file("""
## Agent Identification
- require-agent-header: true
- agent-header-name: X-AI-Bot
- require-disclosure: true
""")
        result = parser.parse(content)
        assert result.policy is not None
        ai = result.policy.agent_identification
        assert ai.require_agent_header is True
        assert ai.agent_header_name == "X-AI-Bot"
        assert ai.require_disclosure is True


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


class TestEdgeCases:
    def test_handles_crlf_line_endings(self) -> None:
        content = "# AGENTS.md\r\n\r\n## Identity\r\n- site: example.com\r\n"
        result = parser.parse(content)
        assert result.success is True
        assert result.policy is not None
        assert result.policy.identity.site == "example.com"

    def test_ignores_prose_lines_within_sections(self) -> None:
        content = """# AGENTS.md

## Identity
This is a prose description that parsers must ignore.
- site: example.com
Another prose line here.
"""
        result = parser.parse(content)
        assert result.success is True
        assert result.policy is not None
        assert result.policy.identity.site == "example.com"

    def test_handles_multiple_blank_lines(self) -> None:
        content = """# AGENTS.md



## Identity

- site: example.com


## Rate Limits

- requests-per-minute: 10

"""
        result = parser.parse(content)
        assert result.success is True
        assert result.policy is not None
        assert result.policy.rate_limits.requests_per_minute == 10

    def test_parses_case_insensitive_boolean_values(self) -> None:
        content = make_minimal_file("""
## Allowed Actions
- read-content: TRUE
- submit-forms: FALSE
- make-purchases: Yes
- modify-account: NO
""")
        result = parser.parse(content)
        assert result.policy is not None
        actions = result.policy.allowed_actions
        assert actions["read_content"] is True
        assert actions["submit_forms"] is False
        assert actions["make_purchases"] is True
        assert actions["modify_account"] is False

    def test_parses_complete_full_featured_file(self) -> None:
        content = """# AGENTS.md

## Identity
- site: enterprise.example.com
- contact: ai-policy@example.com
- last-updated: 2026-03-15
- spec-version: 1.0.0

## Trust Requirements
- minimum-trust-level: 2
- authentication: required
- authentication-methods: oauth2, api-key

## Allowed Actions
- read-content: true
- submit-forms: true
- make-purchases: false
- modify-account: false
- access-api: true

## Rate Limits
- requests-per-minute: 60
- requests-per-hour: 1000
- concurrent-sessions: 5

## Data Handling
- personal-data-collection: standard
- data-retention: 1-year
- third-party-sharing: with-consent
- gdpr-compliance: true

## Restrictions
- disallowed-paths: /admin/*, /internal/*
- require-human-approval: /checkout/confirm
- read-only-paths: /blog/*, /docs/**

## Agent Identification
- require-agent-header: true
- agent-header-name: X-Agent-Identity
- require-disclosure: true
"""
        result = parser.parse(content)
        assert result.success is True
        assert len(result.errors) == 0
        assert result.policy is not None
        assert result.policy.identity.site == "enterprise.example.com"
        assert result.policy.trust_requirements.minimum_trust_level == 2
        assert result.policy.allowed_actions["access_api"] is True
        assert result.policy.rate_limits.requests_per_hour == 1000
        assert result.policy.data_handling.gdpr_compliance is True
        assert "/admin/*" in result.policy.restrictions.disallowed_paths
        assert result.policy.agent_identification.require_disclosure is True

    def test_handles_sections_in_unusual_order(self) -> None:
        content = """# AGENTS.md

## Rate Limits
- requests-per-minute: 10

## Identity
- site: example.com

## Agent Identification
- require-disclosure: true
"""
        result = parser.parse(content)
        assert result.success is True
        assert result.policy is not None
        assert result.policy.rate_limits.requests_per_minute == 10
        assert result.policy.agent_identification.require_disclosure is True

    def test_parses_authentication_methods_with_extra_whitespace(self) -> None:
        content = make_minimal_file("""
## Trust Requirements
- minimum-trust-level: 1
- authentication: optional
- authentication-methods:  oauth2 ,  api-key ,  bearer
""")
        result = parser.parse(content)
        assert result.policy is not None
        assert result.policy.trust_requirements.authentication_methods == [
            "oauth2",
            "api-key",
            "bearer",
        ]

    def test_handles_value_containing_colon(self) -> None:
        content = "# AGENTS.md\n\n## Identity\n- site: example.com\n- contact: admin@example.com:8080\n"
        result = parser.parse(content)
        assert result.policy is not None
        assert result.policy.identity.contact == "admin@example.com:8080"
