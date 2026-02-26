<!-- SPDX-License-Identifier: CC-BY-SA-4.0 -->
<!-- Copyright (c) 2026 MuVeraAI Corporation -->

# FIRE LINE — What This Project Is and Is Not

This document defines the explicit boundaries of the agents-md-spec project.
Read it before submitting code, opening issues, or proposing specification changes.

---

## What This Project IS

**agents-md-spec** is a vendor-neutral, open specification and set of reference parsers
for `AGENTS.md` — a machine-readable file that website operators use to declare their
interaction policies for AI agents.

This project produces:

1. **The AGENTS.md Specification** (`spec/AGENTS-MD-SPEC-001.md`) — a format document.
2. **A JSON Schema** (`spec/agents.schema.json`) — for programmatic validation.
3. **A TypeScript/JS parser** (`parsers/typescript/`) — published to npm as `agents-md`.
4. **A Python parser** (`parsers/python/`) — published to PyPI as `agents-md`.

The project is fully independent. It has no runtime dependency on any proprietary platform,
commercial product, or closed-source system.

---

## What This Project Is NOT

The following things are explicitly OUT OF SCOPE and must never appear in this codebase:

### No Proprietary Branding on the Trust Scale

The trust scale in AGENTS.md uses a **generic 0–5 numeric scale**. The levels are named:
Anonymous, Identified, Verified, Authorized, Privileged, Administrative.

Do not rename this scale using any proprietary product brand. The generic names are permanent.

### No Adaptive or Automatic Trust Progression

Trust levels in AGENTS.md are **static declarations** — an operator sets `minimum-trust-level`
as a number. Parsers read and report it. That is all.

This codebase must never contain:
- Logic that automatically promotes or demotes a trust level based on agent behavior
- Behavioral scoring or trust score computation
- Any concept of trust changing dynamically at runtime

### No Cross-Protocol Orchestration

AGENTS.md parsers fetch and parse a file. They do not orchestrate pipelines, schedule
re-evaluations, or coordinate with other governance protocols.

### No @aumos/ or aumos- Package Dependencies

The parsers have zero runtime dependencies on `@aumos/` npm packages or `aumos-` PyPI
packages. The parsers have zero runtime dependencies on any closed-source package.

TypeScript parser runtime dependencies: none.
Python parser runtime dependencies: none (aiohttp is an optional extra for fetching only).

### No Forbidden Identifiers

The following identifiers must never appear in any source file in this repository:

```
progressLevel, promoteLevel, computeTrustScore, behavioralScore
adaptiveBudget, optimizeBudget, predictSpending
detectAnomaly, generateCounterfactual
PersonalWorldModel, MissionAlignment, SocialTrust
CognitiveLoop, AttentionFilter, GOVERNANCE_PIPELINE
```

### No Latency Targets or Internal Threshold Values

Do not encode any latency budgets (e.g., `<100ms`), performance thresholds, or
tuning parameters in source code, comments, or documentation.

---

## Parser Licensing

The parsers are MIT licensed. This is non-negotiable — MIT maximizes adoption.
Do not relicense parsers under a more restrictive license.

The specification is CC BY-SA 4.0. This ensures that derivative specifications
give back to the commons.

---

## Dependency Rules

| Component | Runtime dependencies | Dev dependencies |
|---|---|---|
| TypeScript parser | none | vitest, tsup, typescript |
| Python parser | none | pytest, ruff, mypy, aiohttp (for tests) |

If a PR adds a runtime dependency, it will be rejected unless the dependency is:
- Pure parsing utility (e.g., a YAML parser for a hypothetical YAML variant)
- Universally available in the target language's standard library
- Approved by a maintainer through an explicit issue discussion

aiohttp for the Python fetcher is the only permitted optional dependency.

---

## How to Propose Changes Within Scope

1. Open an issue describing the specification gap or bug.
2. Reference the relevant section of `AGENTS-MD-SPEC-001.md`.
3. Submit a PR with: spec change + updated JSON Schema + parser implementation + tests.

Changes that cross the fire line will be closed without merge.
