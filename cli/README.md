# agents-md CLI

<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- Copyright (c) 2026 MuVeraAI Corporation -->

Command-line tool for creating, validating, linting, and inspecting
[AGENTS.md](https://github.com/aumos-ai/agents-md-spec) files.

AGENTS.md is the `robots.txt` for AI agents — a machine-readable file that website operators
place at the root of their domain to declare their interaction policies for autonomous AI agents.

Specification: **AGENTS-MD-SPEC-001**

---

## Installation

```bash
npm install -g agents-md
```

Or run without installing:

```bash
npx agents-md <command>
```

---

## Commands

### `agents-md init`

Creates a template AGENTS.md in the current directory (or a specified directory).

```bash
# Create AGENTS.md in the current directory with defaults
agents-md init

# Create with custom options
agents-md init \
  --site example.com \
  --contact ai-policy@example.com \
  --trust-level 2 \
  --auth required \
  --allow-api \
  --data-collection minimal \
  --data-retention session-only \
  --rpm 60 \
  --rph 1000

# Create in a specific directory
agents-md init ./my-project --site myproject.com

# Overwrite an existing AGENTS.md
agents-md init --overwrite --site example.com
```

**Options:**

| Flag | Default | Description |
|---|---|---|
| `--site <domain>` | `example.com` | Domain name (without protocol) |
| `--contact <email>` | (none) | Contact email for policy inquiries |
| `--trust-level <0-5>` | `0` | Minimum trust level (0=Anonymous through 5=Administrative) |
| `--auth <mode>` | `none` | Authentication: `required`, `optional`, or `none` |
| `--allow-api` | `false` | Allow API access actions |
| `--allow-forms` | `false` | Allow form submission actions |
| `--data-collection <level>` | `minimal` | Personal data collection: `none`, `minimal`, `standard`, `extensive` |
| `--data-retention <policy>` | `session-only` | Retention: `none`, `session-only`, `30-days`, `1-year`, `indefinite` |
| `--rpm <n>` | `30` | Requests per minute rate limit |
| `--rph <n>` | `500` | Requests per hour rate limit |
| `--overwrite` | `false` | Overwrite an existing AGENTS.md |

**Note:** Trust levels are static declarations. Trust changes are MANUAL ONLY — the CLI
never sets trust levels automatically based on behavior.

---

### `agents-md validate`

Validates an AGENTS.md file against the specification (AGENTS-MD-SPEC-001).

```bash
# Validate AGENTS.md in the current directory
agents-md validate

# Validate a specific file
agents-md validate /path/to/AGENTS.md

# Output results as JSON
agents-md validate --json AGENTS.md
```

Validation checks include:
- Required `## Identity` section is present with a `site` key
- `site` value is a domain name (no protocol, no spaces)
- `last-updated` is a valid ISO 8601 date
- Trust level is within the valid 0-5 range
- `authentication` is one of: `required`, `optional`, `none`
- All action values are valid booleans
- Rate limit values are non-negative integers
- Data handling values use valid enumerated options
- Path patterns start with `/`
- Agent identification booleans are valid

**Exit codes:** `0` = valid, `1` = invalid or file not found.

**Example output (valid file):**

```
Validating: /home/user/project/AGENTS.md

No issues found. File is valid per AGENTS-MD-SPEC-001.

Results: 0 error(s), 0 warning(s)
Status: VALID
```

**Example output (invalid file):**

```
Validating: /home/user/project/AGENTS.md

  [ERROR] [identity (line 3)] Identity section is missing the required "site" key.
  [WARN]  [file] Missing "# AGENTS.md" title heading.

Results: 1 error(s), 1 warning(s)
Status: INVALID
```

---

### `agents-md lint`

Lints an AGENTS.md file for best practices beyond the hard specification rules.

```bash
# Lint AGENTS.md in the current directory
agents-md lint

# Lint a specific file
agents-md lint /path/to/AGENTS.md

# Show informational messages (in addition to warnings and errors)
agents-md lint --info AGENTS.md

# Output results as JSON
agents-md lint --json AGENTS.md
```

Lint checks (warnings):
- Contact address is present in Identity
- `last-updated` date is present and not more than a year old
- Trust Requirements section is declared
- Write actions are not enabled at trust level 0 (Anonymous)
- Data Handling section is present
- Rate Limits section is present

Lint checks (info):
- `spec-version` is declared
- Allowed Actions section is explicitly declared
- Rate Limits section has at least one value
- Authentication method details are specified
- Agent Identification section is present

**Exit codes:** `0` = pass (no errors or warnings), `1` = fail.

**Example output:**

```
Linting: /home/user/project/AGENTS.md

  [WARN] [identity (line 3)] No contact address specified. Consider adding "- contact: ai-policy@yourdomain.com".
  [WARN] [data handling] No ## Data Handling section. This section is recommended for transparency.
  [INFO] [trust requirements (line 8)] Minimum trust level is 0 (Anonymous). Trust changes are manual — this is a static declaration.

Results: 0 error(s), 2 warning(s), 1 info
Status: FAIL
```

---

### `agents-md info`

Displays a human-readable summary of an AGENTS.md file.

```bash
# Summarize AGENTS.md in the current directory
agents-md info

# Summarize a specific file
agents-md info /path/to/AGENTS.md

# Output as JSON
agents-md info --json AGENTS.md
```

**Example output:**

```
AGENTS.md Summary
=================
File: /home/user/project/AGENTS.md

Identity
  Site:          example.com
  Contact:       ai-policy@example.com
  Last Updated:  2026-02-26
  Spec Version:  1.0.0

Trust Requirements
  Minimum Trust: 2 (Verified)
  Note: Trust level is a static declaration. Changes are manual only.
  Authentication: required

Allowed Actions
  Allowed: read-content, access-api
  Denied:  submit-forms, make-purchases, modify-account, delete-data

Rate Limits
  Requests/min:   60/min
  Requests/hour:  1000/hr
  Concurrent:     5

Data Handling
  Personal Data:    minimal
  Retention:        session-only
  Third-party:      none

Restrictions
  Disallowed paths:        2
  Approval-required paths: 1
  Read-only paths:         3

Agent Identification
  Require header:     false
  Require disclosure: false

Structure
  Total sections:   7
  Known sections:   7 / 7
  Total directives: 24

Trust Level Reference (generic 0-5 scale)
  0 = Anonymous
  1 = Identified
  2 = Verified <-- current minimum
  3 = Authorized
  4 = Privileged
  5 = Administrative
```

---

## Trust Level Scale

AGENTS.md uses a generic 0-5 numeric scale:

| Level | Name | Description |
|---|---|---|
| 0 | Anonymous | No identity verification required |
| 1 | Identified | Agent has declared an identity but it is not verified |
| 2 | Verified | Agent identity has been verified (e.g., API key on file) |
| 3 | Authorized | Agent has been explicitly authorized by a human administrator |
| 4 | Privileged | Agent has elevated permissions |
| 5 | Administrative | Agent has full administrative access |

Trust levels are static declarations set by the site operator.
The CLI never changes or infers trust levels automatically.

---

## Building from Source

```bash
cd cli/
npm install
npm run build
```

This outputs a compiled ESM bundle to `dist/cli.js`.

To run in development mode (no build step):

```bash
npm run dev -- init --site example.com
npm run dev -- validate ./AGENTS.md
npm run dev -- lint ./AGENTS.md
npm run dev -- info ./AGENTS.md
```

---

## License

Apache-2.0. See [LICENSE](../LICENSE) for details.

The AGENTS.md specification itself is licensed under CC BY-SA 4.0.
