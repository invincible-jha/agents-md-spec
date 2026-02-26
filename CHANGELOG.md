<!-- SPDX-License-Identifier: CC-BY-SA-4.0 -->
<!-- Copyright (c) 2026 MuVeraAI Corporation -->

# Changelog

All notable changes to this project are documented here.

This project follows [Semantic Versioning](https://semver.org/) for the parsers.
The specification uses its own version number documented in the spec header.

---

## [0.1.0] — 2026-02-26

### Added

**Specification**
- `spec/AGENTS-MD-SPEC-001.md` — Initial specification draft (spec version 1.0.0)
- `spec/agents.schema.json` — JSON Schema for AGENTS.md files
- `spec/examples/minimal.agents.md` — Minimal valid example
- `spec/examples/blog.agents.md` — Blog with read-only access example
- `spec/examples/e-commerce.agents.md` — E-commerce with purchase restrictions example
- `spec/examples/healthcare.agents.md` — Healthcare with strict data handling example
- `spec/examples/government.agents.md` — Government with high trust requirements example
- `spec/examples/enterprise-saas.agents.md` — SaaS platform with API access and rate limits example

**TypeScript parser** (`agents-md` on npm, `parsers/typescript/`)
- `AgentsMdParser` class — synchronous AGENTS.md string parser
- `fetchPolicy(baseUrl)` — async fetcher implementing the two-URL discovery algorithm
- `validate(policy)` — semantic validator for parsed `AgentsPolicy` objects
- Full TypeScript types for all spec sections
- 100% spec-compliant parsing: boolean coercion, integer validation, array splitting
- HTTPS enforcement, file size limits (1 MB), fetch timeout (10 s)
- Vitest test suite with >80% coverage

**Python parser** (`agents-md` on PyPI, `parsers/python/`)
- `AgentsMdParser` class — synchronous AGENTS.md string parser
- `fetch_policy(base_url)` — async fetcher using aiohttp (optional extra)
- `validate(policy)` — semantic validator for parsed `AgentsPolicy` objects
- Full dataclass types for all spec sections
- 100% spec-compliant parsing: boolean coercion, integer validation, array splitting
- HTTPS enforcement, file size limits (1 MB), fetch timeout (10 s)
- pytest test suite with >80% coverage

**Sections parsed in both parsers:**
- `## Identity` (required) — site, contact, last-updated, spec-version
- `## Trust Requirements` — minimum-trust-level (0–5 generic scale), authentication, authentication-methods
- `## Allowed Actions` — read-content, submit-forms, make-purchases, modify-account, access-api, download-files, upload-files, send-messages, delete-data, create-content
- `## Rate Limits` — requests-per-minute, requests-per-hour, concurrent-sessions
- `## Data Handling` — personal-data-collection, data-retention, third-party-sharing, gdpr-compliance
- `## Restrictions` — disallowed-paths, require-human-approval, read-only-paths
- `## Agent Identification` — require-agent-header, agent-header-name, require-disclosure

---

[0.1.0]: https://github.com/aumos-oss/agents-md-spec/releases/tag/v0.1.0
