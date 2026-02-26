<!-- SPDX-License-Identifier: CC-BY-SA-4.0 -->
<!-- Copyright (c) 2026 MuVeraAI Corporation -->

# Contributing to agents-md-spec

Thank you for your interest in contributing. This project welcomes contributions
to both the specification and the reference parsers.

---

## Before You Start

Read [FIRE_LINE.md](FIRE_LINE.md) to understand what is in and out of scope.
Contributions that cross the fire line will be closed without merge.

---

## Types of Contributions

### 1. Specification Proposals

The specification (`spec/AGENTS-MD-SPEC-001.md`) is the authoritative document.
Parser behavior is derived from it.

**To propose a specification change:**

1. Open an issue with the label `spec-proposal`.
2. Describe the problem the change solves, not just the change itself.
3. Reference the specific section(s) of the spec that would change.
4. Specify whether this is a patch, minor, or major change and why.

Spec changes require discussion before a PR is opened. PRs for spec changes without
a corresponding issue will be asked to open the issue first.

**Spec change requirements:**
- The specification document must be updated with clear, RFC-style language.
- The JSON Schema (`spec/agents.schema.json`) must be updated to match.
- Both reference parsers must be updated to implement the change.
- New tests must be added to both parsers covering the new behavior.
- At least one example file in `spec/examples/` must demonstrate the change,
  or a new example file must be added.

### 2. Parser Bug Reports

If you find a case where a parser does not match the specification:

1. Open an issue with the label `parser-bug`.
2. Include the AGENTS.md input that produces incorrect behavior.
3. Describe what the spec says the correct behavior should be (with section reference).
4. Describe what the parser actually does.

### 3. Parser Improvements

Parser improvements (performance, ergonomics, documentation) that do not change
spec-defined behavior are welcome as direct PRs.

### 4. New Language Parsers

Community parsers in other languages are welcome. Open an issue to discuss placement
in the repository before implementing.

Criteria for inclusion:
- 100% spec-compliant for all parsing rules defined in the specification
- MIT licensed
- Test suite with >80% coverage
- No runtime dependencies beyond what the language standard library provides
  (optional async fetcher dependency is permitted)

---

## Development Workflow

### TypeScript Parser

```bash
cd parsers/typescript

# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type check
npm run typecheck

# Build
npm run build
```

Requirements: Node.js >= 18, npm.

### Python Parser

```bash
cd parsers/python

# Create a virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install with dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run with coverage
pytest --cov

# Type check
mypy src/agents_md

# Lint
ruff check src/ tests/
```

Requirements: Python >= 3.10.

---

## Pull Request Requirements

Before submitting a PR, verify:

- [ ] All tests pass (`npm test` and/or `pytest`)
- [ ] Type checks pass (`npm run typecheck` and/or `mypy --strict`)
- [ ] Linting passes (no ruff or TypeScript errors)
- [ ] Coverage did not drop below 80%
- [ ] Every new source file has the SPDX license header
- [ ] Commit messages follow conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- [ ] The PR description explains WHY the change is needed, not just WHAT changed

---

## License Headers

Every source file must begin with the appropriate license header.

**TypeScript / JavaScript files:**
```
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 MuVeraAI Corporation
```

**Python files:**
```
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 MuVeraAI Corporation
```

**Specification and documentation Markdown files:**
```
<!-- SPDX-License-Identifier: CC-BY-SA-4.0 -->
<!-- Copyright (c) 2026 MuVeraAI Corporation -->
```

---

## Code Style

### TypeScript

- Strict mode — `any` is not permitted
- Named exports only — no default exports
- Descriptive variable names — no single-letter abbreviations
- Functional style preferred over class-based OOP where practical
- Tests are in `tests/` and use Vitest

### Python

- Type hints on all function signatures
- `from __future__ import annotations` at the top of every module
- Dataclasses for structured data (do not introduce Pydantic without discussion)
- Async code only for the fetcher module
- Tests are in `tests/` and use pytest

---

## Governance

This project is maintained by MuVeraAI Corporation. Major specification changes
(new required sections, renamed keys, changed semantics) require maintainer approval.

Minor changes and bug fixes can be merged by any maintainer after review.

All contributions are subject to the project's licensing:
- Parser code: MIT
- Specification and documentation: CC BY-SA 4.0

By submitting a contribution, you agree that your contribution is licensed under
the applicable license for that component.
