# agents-md-spec — Project Instructions for Claude

## Project Identity

This project is **fully independent** from any proprietary platform or commercial product.
It is a vendor-neutral open specification and reference parsers for `AGENTS.md`.

- Specification license: CC BY-SA 4.0
- Parser license: MIT
- GitHub: https://github.com/aumos-oss/agents-md-spec

---

## Absolute Rules (Non-Negotiable)

### 1. Zero proprietary dependencies

The parsers have zero runtime dependencies on any closed-source package.
Never add `@aumos/` npm packages or `aumos-` PyPI packages to any dependency list.

TypeScript parser: zero runtime deps.
Python parser: zero runtime deps (aiohttp is an optional extra, permitted).

### 2. Generic trust scale only

The trust scale is a **generic 0–5 numeric scale**. Use the generic level names:
Anonymous (0), Identified (1), Verified (2), Authorized (3), Privileged (4), Administrative (5).

Never use proprietary branding to name this scale.

### 3. No adaptive trust logic

Trust levels are static declarations. Parsers read a number from a file and report it.
Never implement logic that changes trust levels automatically based on behavior.

### 4. No forbidden identifiers

Never use these identifiers anywhere in source code, comments, or documentation:
`progressLevel`, `promoteLevel`, `computeTrustScore`, `behavioralScore`,
`adaptiveBudget`, `optimizeBudget`, `predictSpending`,
`detectAnomaly`, `generateCounterfactual`,
`PersonalWorldModel`, `MissionAlignment`, `SocialTrust`,
`CognitiveLoop`, `AttentionFilter`, `GOVERNANCE_PIPELINE`

### 5. License headers on every source file

TypeScript / JavaScript:
```
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 MuVeraAI Corporation
```

Python:
```
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 MuVeraAI Corporation
```

Specification Markdown files:
```
<!-- SPDX-License-Identifier: CC-BY-SA-4.0 -->
<!-- Copyright (c) 2026 MuVeraAI Corporation -->
```

---

## Code Standards

### TypeScript (parsers/typescript/)

- Strict mode always on — no `any`, no `as unknown as`
- Named exports only — no default exports
- Zod for runtime validation at system boundaries (spec JSON schema validation)
- Vitest for tests — run with `npm test`
- tsup for build — run with `npm run build`
- Type-check with `npm run typecheck`
- Target: ES2022, Node 18+
- Coverage threshold: 80% lines/functions

### Python (parsers/python/)

- Python 3.10+ with `from __future__ import annotations`
- Type hints on all function signatures — mypy --strict must pass
- Pydantic v2 or dataclasses — currently using dataclasses (do not switch without discussion)
- ruff for linting — zero warnings
- pytest for tests — run with `pytest`
- Coverage threshold: 80%
- Async: use asyncio + aiohttp for the fetcher only

### Both parsers

- One logical change per commit
- Test alongside implementation — no afterthought tests
- Descriptive variable names — no abbreviations
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`

---

## Specification Files (spec/)

- Specification document: `spec/AGENTS-MD-SPEC-001.md`
- JSON Schema: `spec/agents.schema.json`
- Examples: `spec/examples/`
- Spec changes require updating the JSON Schema and at least one parser
- All spec files use CC BY-SA 4.0 license header

---

## What to Do When Asked to Add Features

1. Check FIRE_LINE.md — does the feature cross any boundary?
2. Check the specification — is the feature already specified?
3. If spec change needed: update spec, JSON schema, both parsers, and tests
4. If parser change only: implement in both parsers for consistency

---

## Repository Layout

```
agents-md-spec/
├── spec/                          # CC BY-SA 4.0
│   ├── AGENTS-MD-SPEC-001.md
│   ├── agents.schema.json
│   ├── LICENSE
│   └── examples/
├── parsers/                       # MIT
│   ├── LICENSE
│   ├── typescript/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── parser.ts
│   │   │   ├── validator.ts
│   │   │   └── fetcher.ts
│   │   └── tests/
│   └── python/
│       ├── pyproject.toml
│       └── src/agents_md/
│           ├── __init__.py
│           ├── types.py
│           ├── parser.py
│           ├── validator.py
│           └── fetcher.py
├── docs/
├── README.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── CLAUDE.md                      # This file
├── FIRE_LINE.md
└── LICENSE
```
