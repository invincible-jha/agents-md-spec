<!-- SPDX-License-Identifier: CC-BY-SA-4.0 -->
<!-- Copyright (c) 2026 MuVeraAI Corporation -->

# AGENTS.md Specification

**AGENTS.md** is a machine-readable file that website operators place at the root of their web property to declare their interaction policies for AI agents. Think of it as `robots.txt` — but designed for autonomous AI agents that perform actions, not just crawl content.

[![Specification](https://img.shields.io/badge/spec-AGENTS--MD--SPEC--001-blue)](spec/AGENTS-MD-SPEC-001.md)
[![npm](https://img.shields.io/npm/v/agents-md?label=npm%20agents-md)](https://www.npmjs.com/package/agents-md)
[![PyPI](https://img.shields.io/pypi/v/agents-md?label=pypi%20agents-md)](https://pypi.org/project/agents-md/)
[![License: MIT](https://img.shields.io/badge/parsers-MIT-green)](parsers/LICENSE)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/spec-CC%20BY--SA%204.0-lightgrey)](spec/LICENSE)
[![Governance Score](https://img.shields.io/badge/governance-self--assessed-blue)](https://github.com/aumos-ai/agents-md-spec)

---

## What is AGENTS.md?

When an AI agent visits a website, there is currently no standard way for the site operator to communicate:

- Which actions the agent is allowed to perform
- What level of authentication or identity is required
- Rate limiting expectations
- Data handling commitments
- Which paths are off-limits

AGENTS.md fills this gap. An operator places the file at `https://example.com/AGENTS.md` (or `https://example.com/.well-known/agents.md`) and agents read it before interacting with the site.

### Why not `robots.txt`?

`robots.txt` addresses crawling only. It has no concept of actions, authentication, trust levels, or data policies. AGENTS.md complements `robots.txt` — they coexist and address different concerns.

### Why not `llms.txt`?

`llms.txt` is designed for passive LLM content consumption. AGENTS.md is designed for interactive agents that take actions on behalf of users.

---

## Minimal Example

Place this file at `https://your-site.com/AGENTS.md`:

```markdown
# AGENTS.md

## Identity
- site: your-site.com
- contact: ai-policy@your-site.com
- last-updated: 2026-02-26
```

That is a valid AGENTS.md. Agents will apply permissive defaults for all omitted sections.

## Full Example

```markdown
# AGENTS.md

## Identity
- site: app.example.com
- contact: ai-policy@example.com
- last-updated: 2026-02-26
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
- delete-data: false
- create-content: true

## Rate Limits
- requests-per-minute: 60
- requests-per-hour: 1000
- concurrent-sessions: 5

## Data Handling
- personal-data-collection: minimal
- data-retention: session-only
- third-party-sharing: none
- gdpr-compliance: true

## Restrictions
- disallowed-paths: /admin/*, /internal/*
- require-human-approval: /checkout/*, /account/delete
- read-only-paths: /blog/*, /docs/*

## Agent Identification
- require-agent-header: true
- agent-header-name: X-Agent-Identity
- require-disclosure: false
```

More examples are in [`spec/examples/`](spec/examples/).

---

## Trust Levels

AGENTS.md uses a generic 0–5 numeric scale:

| Level | Name | Description |
|---|---|---|
| 0 | Anonymous | No identity verification required |
| 1 | Identified | Agent has declared an identity but it is not verified |
| 2 | Verified | Agent identity has been verified (e.g., API key on file) |
| 3 | Authorized | Agent explicitly authorized by a human administrator |
| 4 | Privileged | Agent has elevated permissions (site-managed service account) |
| 5 | Administrative | Full administrative access |

---

## Parsers

Reference parsers are provided in two languages. Both are MIT licensed.

### TypeScript / JavaScript

```bash
npm install agents-md
```

```typescript
import { AgentsMdParser, fetchPolicy, validate } from 'agents-md';

// Parse from a string
const parser = new AgentsMdParser();
const result = parser.parse(fileContent);
if (result.success && result.policy) {
  console.log(result.policy.identity.site);
}

// Fetch directly from a URL
const fetched = await fetchPolicy('https://example.com');
if (fetched?.success && fetched.policy) {
  const validation = validate(fetched.policy);
  console.log(validation.valid);
}
```

See [`parsers/typescript/`](parsers/typescript/) for full documentation.

### Python

```bash
pip install agents-md
# For async fetching:
pip install "agents-md[fetcher]"
```

```python
from agents_md import AgentsMdParser, validate

# Parse from a string
parser = AgentsMdParser()
result = parser.parse(file_content)
if result.success and result.policy:
    validation = validate(result.policy)
    print(validation.valid)

# Fetch asynchronously (requires aiohttp)
import asyncio
from agents_md import fetch_policy

async def main():
    result = await fetch_policy("https://example.com")
    if result and result.success and result.policy:
        print(result.policy.identity.site)

asyncio.run(main())
```

See [`parsers/python/`](parsers/python/) for full documentation.

---

## Specification

The full specification is at [`spec/AGENTS-MD-SPEC-001.md`](spec/AGENTS-MD-SPEC-001.md).

Key topics covered:

- File location and discovery algorithm
- Complete section reference (Identity, Trust Requirements, Allowed Actions, Rate Limits, Data Handling, Restrictions, Agent Identification)
- Parsing rules for boolean, integer, and array values
- Trust level definitions (0–5 generic scale)
- Path pattern syntax (glob)
- Caching rules (24-hour maximum)
- Security requirements (HTTPS mandatory)
- Agent compliance recommendations
- ABNF grammar

The JSON Schema for programmatic validation is at [`spec/agents.schema.json`](spec/agents.schema.json).

---

## Repository Structure

```
agents-md-spec/
├── spec/
│   ├── AGENTS-MD-SPEC-001.md    # The specification
│   ├── agents.schema.json        # JSON Schema
│   ├── LICENSE                   # CC BY-SA 4.0
│   └── examples/
│       ├── minimal.agents.md
│       ├── blog.agents.md
│       ├── e-commerce.agents.md
│       ├── healthcare.agents.md
│       ├── government.agents.md
│       └── enterprise-saas.agents.md
├── parsers/
│   ├── LICENSE                   # MIT
│   ├── typescript/               # npm: agents-md
│   └── python/                   # PyPI: agents-md
├── docs/
├── README.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── CLAUDE.md
├── FIRE_LINE.md
└── LICENSE
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to propose changes to the specification or submit parser improvements.

---

## License

- **Specification** (`spec/`): [CC BY-SA 4.0](spec/LICENSE) — share and adapt with attribution, under the same license.
- **Parsers** (`parsers/`): [MIT](parsers/LICENSE) — maximum adoption, minimal restriction.
- **This README and repo-level files**: CC BY-SA 4.0.

Copyright (c) 2026 MuVeraAI Corporation.
