# AGENTS.md Specification

**Specification ID:** AGENTS-MD-SPEC-001
**Version:** 1.0.0
**Status:** Draft
**Date:** 2026-02-26
**License:** [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
**Community Group:** [Agent Manifest Community Group (W3C)](../docs/w3c-community-group-charter.md)
**Citation:** Agent Manifest Community Group, "AGENTS.md Specification," AGENTS-MD-SPEC-001, 2026. Available: https://github.com/aumos-oss/agents-md-spec

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Terminology](#2-terminology)
3. [File Location and Discovery](#3-file-location-and-discovery)
4. [File Format](#4-file-format)
5. [Sections Reference](#5-sections-reference)
6. [Parsing Rules](#6-parsing-rules)
7. [Trust Levels](#7-trust-levels)
8. [Allowed Actions](#8-allowed-actions)
9. [Path Patterns](#9-path-patterns)
10. [Caching](#10-caching)
11. [Security Requirements](#11-security-requirements)
12. [Agent Compliance](#12-agent-compliance)
13. [Versioning](#13-versioning)
14. [Examples](#14-examples)
15. [Standardization Path](#15-standardization-path)

---

## 1. Introduction

### 1.1 What is AGENTS.md?

AGENTS.md is a machine-readable file that website operators place at the root of their web property (or in the `.well-known/` directory) to declare their interaction policies for AI agents. It serves a similar role to `robots.txt` for web crawlers, but is designed specifically for interactive AI agents that can perform actions — not just read content.

### 1.2 Why AGENTS.md Exists

The rise of autonomous AI agents has created a gap between what AI systems can technically do on a website and what operators actually want them to do. Existing mechanisms are insufficient:

- **`robots.txt`** addresses crawling only. It has no concept of actions, authentication, trust, or data handling policies.
- **`llms.txt`** is designed for passive content consumption, not interactive agent behavior.
- **Terms of Service** are human-readable legal documents that agents cannot programmatically parse and act upon.
- **OpenAPI/Swagger specifications** describe capabilities, not behavioral constraints or permissions.

AGENTS.md fills this gap by providing a structured, machine-readable declaration of:

- What actions an AI agent is permitted to perform
- What level of trust or authentication is required
- Rate limiting expectations
- Data handling commitments
- Path-level restrictions
- Agent identification requirements

### 1.3 Design Philosophy

AGENTS.md is designed with the following principles:

1. **Human-readable first.** The format is Markdown, readable by humans without tooling.
2. **Machine-parseable.** Structured `- key: value` syntax is unambiguous and easy to parse.
3. **Permissive defaults.** Missing sections do not mean "deny." Agents should treat absent sections as permissive unless the site explicitly restricts.
4. **Layered.** Files can be combined with other policy mechanisms; AGENTS.md is advisory unless an agent chooses to treat it as binding.
5. **Extensible.** Custom sections prefixed with `x-` are reserved for site-specific extensions.

### 1.4 Relationship to Other Standards

| Standard | Purpose | AGENTS.md Relationship |
|---|---|---|
| `robots.txt` | Crawl permissions for web crawlers | Complements — AGENTS.md addresses agent actions, not crawling |
| `llms.txt` | LLM content accessibility hints | Complements — `llms.txt` is for content, AGENTS.md is for behavior |
| OpenAPI 3.x | API capability description | Complements — describes constraints, not capabilities |
| W3C WAI | Accessibility | Unrelated |
| W3C Community Group | Standardization process | AGENTS.md is submitted to the [Agent Manifest Community Group](../docs/w3c-community-group-charter.md) for consensus-building and eventual W3C Report status |

---

## 2. Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

**AI Agent:** An autonomous or semi-autonomous software system that uses a large language model or similar AI capability to perceive, reason, and take actions on behalf of a user or organization.

**Operator:** The person or organization that controls a web property and authors the AGENTS.md file for that property.

**Parser:** Software that reads and interprets an AGENTS.md file.

**Policy:** The set of rules and declarations contained within a parsed AGENTS.md file.

**Trust Level:** A numeric indicator (0–5) representing the minimum level of verified identity and authorization required for an agent to perform certain actions.

**Well-known URI:** A URI of the form `/.well-known/<filename>` as defined in [RFC 8615](https://tools.ietf.org/html/rfc8615).

---

## 3. File Location and Discovery

### 3.1 Canonical Locations

An AGENTS.md file MUST be located at one of the following paths on the web server, in order of precedence:

1. `/{domain}/AGENTS.md` — Root of the web property (e.g., `https://example.com/AGENTS.md`)
2. `/{domain}/.well-known/agents.md` — Well-known URI (e.g., `https://example.com/.well-known/agents.md`)

When both locations contain a file, the root-level `AGENTS.md` takes precedence.

### 3.2 Discovery Algorithm

An agent or parser SHOULD follow this discovery algorithm:

```
1. Attempt to fetch {baseUrl}/AGENTS.md
   - If HTTP 200: use this file. Stop.
   - If HTTP 301/302: follow redirect once, then apply the same logic.
   - If HTTP 404 or other error: continue to step 2.

2. Attempt to fetch {baseUrl}/.well-known/agents.md
   - If HTTP 200: use this file. Stop.
   - If HTTP 404 or other error: no AGENTS.md found.

3. If no file found: apply permissive defaults (no policy).
```

### 3.3 Content-Type

Servers SHOULD serve AGENTS.md files with the following Content-Type:

```
Content-Type: text/markdown; charset=utf-8
```

Servers MAY also serve with `text/plain; charset=utf-8`. Parsers MUST accept both.

### 3.4 Scoping

An AGENTS.md file at the root of a domain applies to the **entire domain and all subpaths** unless restricted by the `Restrictions` section. It does NOT apply to subdomains.

A separate AGENTS.md SHOULD be placed at `https://subdomain.example.com/AGENTS.md` for subdomains that require different policies.

---

## 4. File Format

### 4.1 Encoding

AGENTS.md files MUST be encoded in UTF-8.

### 4.2 Line Endings

Parsers MUST accept both Unix (`\n`) and Windows (`\r\n`) line endings.

### 4.3 Top-Level Structure

An AGENTS.md file consists of:

1. A required top-level heading: `# AGENTS.md`
2. One or more sections, each beginning with a level-2 heading (`##`)
3. Within each section, zero or more directive lines in the format `- key: value`

```markdown
# AGENTS.md

## SectionName
- key: value
- another-key: another value
```

### 4.4 Comments

Lines beginning with `#` that are not Markdown headings are treated as comments and MUST be ignored by parsers.

```markdown
# AGENTS.md
# This comment is ignored by parsers

## Identity
# The following lines define the site identity
- site: example.com
```

### 4.5 Blank Lines

Blank lines MUST be ignored within sections.

### 4.6 Case Sensitivity

Section names are case-insensitive. Key names within sections are case-insensitive. Parsers SHOULD normalize to lowercase before comparison.

Values are generally case-insensitive for enumerated types (e.g., `true`, `True`, `TRUE` are all equivalent) but case-sensitive for string values like domain names and paths.

### 4.7 Extensions

Operators MAY define custom sections or keys prefixed with `x-`. Parsers MUST NOT reject files containing extension sections or keys; they SHOULD preserve extension data if their data model supports it.

---

## 5. Sections Reference

### 5.1 Identity (REQUIRED)

Declares the identity and contact information for the web property.

```markdown
## Identity
- site: example.com
- contact: ai-policy@example.com
- last-updated: 2026-03-15
```

| Key | Type | Required | Description |
|---|---|---|---|
| `site` | string | REQUIRED | The domain name of the web property (without protocol) |
| `contact` | string | OPTIONAL | Email address for AI policy inquiries |
| `last-updated` | string | OPTIONAL | ISO 8601 date when the policy was last updated |

### 5.2 Trust Requirements (RECOMMENDED)

Declares the minimum trust level and authentication requirements for agents.

```markdown
## Trust Requirements
- minimum-trust-level: 2
- authentication: required
- authentication-methods: oauth2, api-key
```

| Key | Type | Required | Description |
|---|---|---|---|
| `minimum-trust-level` | integer (0–5) | OPTIONAL | Minimum trust level required. Default: 0 |
| `authentication` | enum | OPTIONAL | Whether authentication is required. Values: `required`, `optional`, `none`. Default: `none` |
| `authentication-methods` | string[] | OPTIONAL | Comma-separated list of accepted authentication methods |

### 5.3 Allowed Actions (OPTIONAL)

Declares which action categories are permitted for agents.

```markdown
## Allowed Actions
- read-content: true
- submit-forms: false
- make-purchases: false
- modify-account: false
- access-api: true
```

| Key | Type | Description |
|---|---|---|
| `read-content` | boolean | May the agent read page content? Default: true |
| `submit-forms` | boolean | May the agent submit HTML forms? Default: false |
| `make-purchases` | boolean | May the agent initiate or complete purchases? Default: false |
| `modify-account` | boolean | May the agent modify account settings or data? Default: false |
| `access-api` | boolean | May the agent access documented APIs? Default: false |

Operators MAY define custom action keys. Parsers MUST NOT reject files with unrecognized action keys.

Default for any unspecified action is `false` unless the key is `read-content`, which defaults to `true`.

### 5.4 Rate Limits (OPTIONAL)

Declares the rate limits the operator requests agents to observe.

```markdown
## Rate Limits
- requests-per-minute: 30
- requests-per-hour: 500
- concurrent-sessions: 3
```

| Key | Type | Description |
|---|---|---|
| `requests-per-minute` | integer | Maximum requests per minute |
| `requests-per-hour` | integer | Maximum requests per hour |
| `concurrent-sessions` | integer | Maximum concurrent sessions |

All rate limit values MUST be positive integers. A value of `0` MUST be interpreted as "no limit."

### 5.5 Data Handling (OPTIONAL)

Declares the operator's commitments regarding data collected from agent interactions.

```markdown
## Data Handling
- personal-data-collection: minimal
- data-retention: session-only
- third-party-sharing: none
- gdpr-compliance: true
```

| Key | Type | Values | Description |
|---|---|---|---|
| `personal-data-collection` | enum | `none`, `minimal`, `standard`, `extensive` | Level of personal data collection |
| `data-retention` | enum | `none`, `session-only`, `30-days`, `1-year`, `indefinite` | How long interaction data is retained |
| `third-party-sharing` | enum | `none`, `anonymized`, `with-consent`, `unrestricted` | Third-party data sharing policy |
| `gdpr-compliance` | boolean | — | Whether the site is GDPR-compliant |

### 5.6 Restrictions (OPTIONAL)

Declares path-level restrictions on agent access.

```markdown
## Restrictions
- disallowed-paths: /admin/*, /internal/*
- require-human-approval: /checkout/*, /account/delete
- read-only-paths: /blog/*, /docs/*
```

| Key | Type | Description |
|---|---|---|
| `disallowed-paths` | string[] | Paths agents MUST NOT access. Glob patterns supported. |
| `require-human-approval` | string[] | Paths that MUST have explicit human confirmation before agent action |
| `read-only-paths` | string[] | Paths where only read operations are permitted |

### 5.7 Agent Identification (OPTIONAL)

Declares requirements for agent self-identification.

```markdown
## Agent Identification
- require-agent-header: true
- agent-header-name: X-Agent-Identity
- require-disclosure: true
```

| Key | Type | Description |
|---|---|---|
| `require-agent-header` | boolean | Must the agent send an identifying HTTP header? Default: false |
| `agent-header-name` | string | The HTTP header name to use for agent identification. Default: `X-Agent-Identity` |
| `require-disclosure` | boolean | Must the agent disclose its AI nature to users? Default: false |

---

## 6. Parsing Rules

### 6.1 Section Extraction

1. Split the file content on level-2 Markdown headings (`## `).
2. The text before the first `##` heading is the preamble and MUST be ignored by parsers (it may contain the `# AGENTS.md` title and prose description).
3. Each section name is the text following `## ` on that line, trimmed of whitespace.

### 6.2 Key-Value Extraction

Within each section:

1. Each non-empty, non-comment line is examined.
2. Lines beginning with `- ` (hyphen + space) are directive lines.
3. A directive line contains exactly one `:` separator. Everything before the first `:` is the key; everything after (trimmed) is the value.
4. Keys MUST be normalized to lowercase and have leading/trailing whitespace removed.
5. Values MUST have leading/trailing whitespace removed before type conversion.
6. Lines not matching the `- key: value` pattern within a section MUST be ignored (not cause an error).

### 6.3 Boolean Values

The following string values MUST be interpreted as `true` (case-insensitive):
- `true`
- `yes`
- `1`
- `on`

The following string values MUST be interpreted as `false` (case-insensitive):
- `false`
- `no`
- `0`
- `off`

Any other value for a boolean field MUST generate a parse warning and the default value for that field MUST be used.

### 6.4 Integer Values

Integer values MUST be parsed as base-10 integers. Non-numeric values MUST generate a parse warning and the field MUST be omitted (not defaulted to 0, since 0 has a specific meaning).

### 6.5 Array Values

Array values are comma-separated strings. Each element MUST have leading/trailing whitespace trimmed. Empty elements (from trailing commas or double commas) MUST be discarded.

Example: `"oauth2, api-key, bearer "` → `["oauth2", "api-key", "bearer"]`

### 6.6 Missing Sections

If a section is missing from the file, parsers MUST apply the following defaults:

| Section | Default Behavior |
|---|---|
| `Identity` | Validation error — this section is REQUIRED |
| `Trust Requirements` | `minimumTrustLevel: 0`, `authentication: "none"` |
| `Allowed Actions` | `readContent: true`, all other actions: `false` |
| `Rate Limits` | No rate limits specified (unlimited) |
| `Data Handling` | All fields undefined |
| `Restrictions` | No restrictions |
| `Agent Identification` | All requirements false |

### 6.7 Unknown Keys

Parsers MUST NOT reject files due to unknown keys within known sections. Unknown keys SHOULD be preserved in a map if the data model supports it.

### 6.8 Malformed Files

A file with no `## Identity` section MUST result in a parse error. All other malformed conditions SHOULD result in warnings, not errors.

---

## 7. Trust Levels

AGENTS.md uses a generic 0–5 trust scale to indicate the level of verified identity and authorization an agent must demonstrate:

| Level | Name | Description |
|---|---|---|
| 0 | Anonymous | No identity verification required |
| 1 | Identified | Agent has declared an identity (header or token) but it is not verified |
| 2 | Verified | Agent identity has been verified (e.g., API key on file) |
| 3 | Authorized | Agent has been explicitly authorized for the site by a human administrator |
| 4 | Privileged | Agent has elevated permissions (e.g., site-managed service account) |
| 5 | Administrative | Agent has full administrative access (system-level trust) |

Trust levels are advisory. The operator's backend systems enforce the actual authorization; the AGENTS.md declaration communicates the expected minimum so agents can self-select or request the appropriate level.

---

## 8. Allowed Actions

### 8.1 Standard Action Keys

The following action keys are defined by this specification:

| Key | Description |
|---|---|
| `read-content` | Reading visible page content, text, and publicly accessible data |
| `submit-forms` | Submitting HTML form data (including search, contact, login forms) |
| `make-purchases` | Initiating or completing financial transactions |
| `modify-account` | Changing account settings, preferences, or profile data |
| `access-api` | Making calls to documented API endpoints |
| `download-files` | Downloading files or binary content |
| `upload-files` | Uploading files or binary content |
| `send-messages` | Sending messages (email, chat, notifications) on behalf of a user |
| `delete-data` | Deleting any data, records, or content |
| `create-content` | Creating new content, posts, or records |

### 8.2 Custom Action Keys

Operators MAY define custom action keys. Custom keys SHOULD be prefixed with `x-` to avoid collision with future specification updates.

---

## 9. Path Patterns

### 9.1 Pattern Syntax

Path patterns in restriction sections use a simplified glob syntax:

| Pattern | Meaning |
|---|---|
| `/exact/path` | Matches exactly this path |
| `/prefix/*` | Matches `/prefix/` and any single path segment below it |
| `/prefix/**` | Matches `/prefix/` and any path at any depth below it |
| `*.ext` | Matches any path ending with `.ext` |

### 9.2 Pattern Matching Rules

1. Path patterns MUST begin with `/`.
2. Patterns are matched against the URL path component only (not scheme, host, query, or fragment).
3. Matching is case-sensitive.
4. More specific patterns take precedence over less specific patterns.
5. `disallowed-paths` takes precedence over `read-only-paths` for the same path.

---

## 10. Caching

### 10.1 Cache Duration

Agents MAY cache a fetched AGENTS.md policy for a period not exceeding **24 hours** from the time of fetch.

Agents SHOULD respect HTTP `Cache-Control` headers if present on the AGENTS.md response. If a `max-age` directive is present, agents MUST use the smaller of `max-age` and 24 hours as the cache duration.

### 10.2 Cache Invalidation

Agents SHOULD re-fetch the policy if:

- The cached copy has expired.
- The agent is starting a new session with the site.
- A server response indicates the policy may have changed (e.g., `HTTP 412 Precondition Failed` with a policy-changed hint).

### 10.3 Stale Cache

If a re-fetch fails (network error, server error) and the agent holds a stale cached copy, the agent MAY continue using the stale copy for up to an additional 1 hour, after which the agent SHOULD fall back to permissive defaults.

---

## 11. Security Requirements

### 11.1 HTTPS

AGENTS.md files MUST be served over HTTPS. Agents MUST NOT use an AGENTS.md file fetched over plain HTTP.

Rationale: Serving policy over plain HTTP is vulnerable to man-in-the-middle attacks that could inject permissive policies.

### 11.2 Redirect Handling

Agents MUST follow HTTPS redirects (301, 302, 307, 308) but MUST NOT follow redirects from HTTPS to HTTP (downgrade attacks). A redirect that downgrades the connection MUST result in the agent treating the fetch as failed.

### 11.3 File Size Limits

Agents SHOULD enforce a maximum AGENTS.md file size of **1 MB**. Files exceeding this limit SHOULD be rejected with a warning.

### 11.4 Timeout

Agents SHOULD apply a fetch timeout of **10 seconds**. If the file cannot be fetched within this timeout, the agent SHOULD fall back to permissive defaults.

### 11.5 Subdomain Isolation

An AGENTS.md file at `example.com` does NOT apply to `subdomain.example.com`. Each subdomain MUST have its own AGENTS.md if a policy is desired.

---

## 12. Agent Compliance

### 12.1 Compliance is Advisory

This specification does not create a technical enforcement mechanism. AGENTS.md is a declaration of operator intent. Well-behaved agents SHOULD honor the policy; the specification assumes cooperative agents acting in good faith.

### 12.2 Recommended Compliance Steps

A compliant agent implementation SHOULD:

1. Fetch and cache the AGENTS.md policy before beginning any interaction with a site.
2. Check `minimum-trust-level` against its own trust credential level; abort if insufficient.
3. Respect `disallowed-paths` — never access paths matching these patterns.
4. Respect `require-human-approval` — pause and request confirmation before acting on these paths.
5. Observe declared `rate-limits` as upper bounds (not targets).
6. Send the required identification header if `require-agent-header: true`.
7. Disclose its AI nature to users when interacting on sites with `require-disclosure: true`.
8. Respect boolean action permissions — do not attempt disallowed action types.

### 12.3 Conflict Resolution

If an agent holds policies from multiple sources (e.g., user-provided configuration and a site's AGENTS.md), the more restrictive policy MUST take precedence.

---

## 13. Versioning

### 13.1 Specification Versioning

This specification uses [Semantic Versioning](https://semver.org/). The specification ID (`AGENTS-MD-SPEC-001`) is permanent for this major version series.

### 13.2 File Versioning

Operators MAY add a `spec-version` key to the Identity section to declare which version of the specification their file targets:

```markdown
## Identity
- site: example.com
- spec-version: 1.0.0
```

Parsers encountering a `spec-version` value higher than their supported version SHOULD issue a warning but MUST NOT refuse to parse the file.

### 13.3 Backwards Compatibility

Future minor and patch versions of this specification will not remove or rename any existing keys. New optional keys may be added. New required sections will not be added in minor versions.

---

## 14. Examples

See the `/spec/examples/` directory in this repository for complete AGENTS.md examples:

- `minimal.agents.md` — Bare minimum valid file
- `blog.agents.md` — A blog with read-only access
- `e-commerce.agents.md` — An e-commerce site with purchase restrictions
- `healthcare.agents.md` — Healthcare site with strict data handling
- `government.agents.md` — Government site with high trust requirements
- `enterprise-saas.agents.md` — SaaS platform with API access and rate limits

---

## 15. Standardization Path

### 15.1 W3C Community Group

This specification is submitted to the **Agent Manifest Community Group** at W3C for open, multi-stakeholder standardization. The Community Group process allows any individual or organization to participate without W3C membership, while providing the IP framework and institutional credibility needed for broad adoption.

The full Community Group charter is available at [`docs/w3c-community-group-charter.md`](../docs/w3c-community-group-charter.md).

**Community Group URI:** `https://www.w3.org/community/agentmanifest/` (proposed)
**GitHub:** `https://github.com/aumos-oss/agents-md-spec`
**Mailing list:** To be established upon Community Group formation

### 15.2 Citation Format

When citing this specification in academic or standards documents, use the following format:

**W3C Community Group Report citation:**

> Agent Manifest Community Group. *AGENTS.md Specification*, AGENTS-MD-SPEC-001, Version 1.0.0. W3C Community Group Draft Report, 2026. Available at: https://github.com/aumos-oss/agents-md-spec

**BibTeX:**

```bibtex
@techreport{agentmanifest-spec-001,
  author      = {{Agent Manifest Community Group}},
  title       = {{AGENTS.md} Specification},
  number      = {AGENTS-MD-SPEC-001},
  institution = {W3C Community Group},
  year        = {2026},
  url         = {https://github.com/aumos-oss/agents-md-spec},
  note        = {Version 1.0.0, Draft}
}
```

### 15.3 Design Philosophy and the robots.txt Analogy

AGENTS.md is `robots.txt` for AI agents.

`robots.txt` succeeded as a web convention because it was simple, hosted at a predictable location, machine-readable without special libraries, and honored by cooperative actors. AGENTS.md follows the same design philosophy:

1. **Plain text, human-readable.** A Markdown file anyone can read and write without tooling.
2. **Predictable location.** Hosted at `/{domain}/AGENTS.md` or `/.well-known/agents.md`.
3. **No special libraries required to read.** The `- key: value` format is parseable in under 100 lines of code in any language.
4. **Advisory, not enforceable.** Compliance is the mark of a well-behaved agent, not a technical guarantee.

This philosophy guides all normative decisions in the specification: when in doubt, choose the simpler approach.

### 15.4 Community Group Deliverables and Schedule

The Community Group is committed to producing the following:

| Deliverable | Target Phase | Target License |
|---|---|---|
| AGENTS.md Specification (W3C Community Group Report) | Phase 3 (month 10–12) | CC BY-SA 4.0 |
| JSON Schema for AGENTS.md | Phase 2 (month 4–9) | CC BY-SA 4.0 |
| Conformance Test Suite | Phase 2 (month 4–9) | MIT |
| TypeScript Reference Parser | Phase 1 (month 1–3) | MIT |
| Python Reference Parser | Phase 1 (month 1–3) | MIT |
| Adoption Guidance Documents | Phase 3 (month 10–12) | CC BY-SA 4.0 |

See [`docs/w3c-community-group-charter.md`](../docs/w3c-community-group-charter.md) for the full timeline and participation details.

### 15.5 How to Participate

The Community Group is open to all. To join:

1. Create or log into your [W3C account](https://www.w3.org/accounts/request).
2. Navigate to the [Agent Manifest Community Group page](https://www.w3.org/community/agentmanifest/).
3. Click "Join this Group" and sign the W3C Community Contributor License Agreement (CLA).

To contribute to the specification before the Community Group is formally established, open an issue or pull request on the [GitHub repository](https://github.com/aumos-oss/agents-md-spec).

---

## Appendix A: ABNF Grammar

The following ABNF grammar (per [RFC 5234](https://tools.ietf.org/html/rfc5234)) provides a formal definition of the AGENTS.md format:

```abnf
agents-md      = preamble *section
preamble       = [title-line *any-line]
title-line     = "# AGENTS.md" CRLF
section        = section-heading *section-line
section-heading = "## " section-name CRLF
section-name   = 1*VCHAR
section-line   = directive-line / comment-line / blank-line / prose-line
directive-line = "- " key ": " value CRLF
comment-line   = "#" *VCHAR CRLF
blank-line     = CRLF
prose-line     = 1*VCHAR CRLF
key            = 1*(ALPHA / DIGIT / "-")
value          = *VCHAR
CRLF           = CR LF / LF
```

---

## Appendix B: Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-02-26 | Initial specification draft |
| 1.0.1 | 2026-02-26 | Added Section 15 (Standardization Path), W3C Community Group citation format, and Community Group reference to Section 1.4 relationship table |

---

*This specification is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). You are free to share and adapt this specification for any purpose, provided you give appropriate credit and distribute your contributions under the same license.*
