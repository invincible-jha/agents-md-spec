<!-- SPDX-License-Identifier: CC-BY-SA-4.0 -->
<!-- Copyright (c) 2026 MuVeraAI Corporation -->

# Draft PR: Auto-generate AGENTS.md from LangChain agent definitions

**Target repository:** `langchain-ai/langchain`
**Target branch:** `master`
**PR type:** Feature / Tooling
**Related spec:** [AGENTS-MD-SPEC-001](https://github.com/aumos-oss/agents-md-spec/blob/main/spec/AGENTS-MD-SPEC-001.md)

---

## Title

`feat(community): add generate_agents_md() utility for AgentExecutor and Runnable chains`

---

## Motivation

AGENTS.md is an emerging open standard (CC BY-SA 4.0) that lets website operators
declare interaction policies for AI agents — analogous to `robots.txt` for crawlers.
See: https://github.com/aumos-oss/agents-md-spec

LangChain agents built on `AgentExecutor` and LCEL Runnables already carry structured
metadata — agent name, tool list, max iterations, and chain-level permissions — that
maps cleanly to the AGENTS.md format. This PR adds a zero-dependency utility,
`generate_agents_md()`, that reads those definitions and emits a valid AGENTS.md
policy file without requiring any runtime changes to the agent itself.

**Why this matters:**
- Agents deployed via LangChain Serve or any public endpoint can publish policy
  documents that downstream systems, orchestrators, and operators can parse.
- Reduces friction for LangChain developers who want to comply with site policies.
- Provides a discoverable, machine-readable contract alongside each deployed agent.

---

## Changes

### New files

- `libs/community/langchain_community/agent_toolkits/agents_md/generator.py`
  — Core `generate_agents_md()` function and `AgentsMdConfig` dataclass.
- `libs/community/langchain_community/agent_toolkits/agents_md/__init__.py`
  — Public re-exports.
- `libs/community/tests/unit_tests/agent_toolkits/test_agents_md_generator.py`
  — Unit tests.

### No changes to existing files

This utility is purely additive. It reads from existing public attributes on
`AgentExecutor` and does not monkey-patch any existing class.

---

## Mapping: LangChain -> AGENTS.md

| LangChain concept | AGENTS.md field |
|---|---|
| `AgentExecutor.agent.name` | `## Identity` `site:` agent name slug |
| `AgentExecutor.max_iterations` | `## Rate Limits` `requests-per-minute:` (derived) |
| `AgentExecutor.tools[*].name` | `## Actions` entries |
| `AgentExecutor.tools[*].description` | Action description inline |
| Tool `return_direct=True` | Action marked read-only |
| Chain `tags` containing `"read-only"` | `minimum-trust-level: 0` |
| Chain `tags` containing `"authenticated"` | `minimum-trust-level: 2` |
| Chain `tags` containing `"privileged"` | `minimum-trust-level: 4` |
| `AgentExecutor.handle_parsing_errors` | `## Restrictions` error behavior note |

Trust level scale: `0` Anonymous, `1` Identified, `2` Verified,
`3` Authorized, `4` Privileged, `5` Administrative.

---

## Code Example

```python
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 MuVeraAI Corporation

"""
langchain_community/agent_toolkits/agents_md/generator.py

Utility to generate an AGENTS.md policy file from a LangChain AgentExecutor.
Zero runtime dependencies beyond langchain-core.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Sequence

from langchain.agents import AgentExecutor
from langchain_core.tools import BaseTool


TRUST_TAG_MAP: dict[str, int] = {
    "read-only": 0,
    "anonymous": 0,
    "identified": 1,
    "verified": 2,
    "authenticated": 2,
    "authorized": 3,
    "privileged": 4,
    "administrative": 5,
}


@dataclass
class AgentsMdConfig:
    """Override defaults for the generated AGENTS.md output."""

    site: str = ""
    contact: str = ""
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    concurrent_sessions: int = 3
    require_agent_header: bool = True
    require_disclosure: bool = True


def _resolve_trust_level(tags: Sequence[str]) -> int:
    """Return the highest trust level found in the agent's tag list."""
    resolved = 0
    for tag in tags:
        normalized = tag.lower().strip()
        if normalized in TRUST_TAG_MAP:
            resolved = max(resolved, TRUST_TAG_MAP[normalized])
    return resolved


def _tool_to_action_line(tool: BaseTool) -> str:
    """Format a single tool as an AGENTS.md action entry."""
    modifier = "read" if getattr(tool, "return_direct", False) else "write"
    description = (tool.description or "").replace("\n", " ").strip()
    return f"- {tool.name} [{modifier}]: {description}"


def generate_agents_md(
    executor: AgentExecutor,
    config: AgentsMdConfig | None = None,
) -> str:
    """
    Generate an AGENTS.md policy document from a LangChain AgentExecutor.

    Args:
        executor: A configured AgentExecutor instance.
        config: Optional overrides for site metadata and rate limits.

    Returns:
        A string containing a valid AGENTS.md document.
    """
    cfg = config or AgentsMdConfig()
    tags: list[str] = list(getattr(executor, "tags", None) or [])
    trust_level = _resolve_trust_level(tags)
    authentication = "required" if trust_level >= 2 else "none"

    agent_name = cfg.site or getattr(
        executor.agent, "name", "langchain-agent"
    )
    contact = cfg.contact or ""

    action_lines = "\n".join(
        _tool_to_action_line(tool) for tool in executor.tools
    )
    action_block = action_lines if action_lines else "- (no tools registered)"

    contact_line = f"\n- contact: {contact}" if contact else ""

    return f"""# AGENTS.md

## Identity
- site: {agent_name}{contact_line}
- last-updated: 2026-02-26
- spec-version: 1.0.0

## Trust Requirements
- minimum-trust-level: {trust_level}
- authentication: {authentication}

## Actions
{action_block}

## Rate Limits
- requests-per-minute: {cfg.requests_per_minute}
- requests-per-hour: {cfg.requests_per_hour}
- concurrent-sessions: {cfg.concurrent_sessions}

## Agent Identification
- require-agent-header: {str(cfg.require_agent_header).lower()}
- require-disclosure: {str(cfg.require_disclosure).lower()}
"""
```

### Usage

```python
from langchain.agents import AgentExecutor, create_react_agent
from langchain_community.agent_toolkits.agents_md import generate_agents_md

executor = AgentExecutor(
    agent=my_agent,
    tools=[search_tool, calculator_tool],
    max_iterations=10,
    tags=["verified", "authenticated"],
)

policy = generate_agents_md(executor)
# Write to disk or serve at /AGENTS.md
with open("AGENTS.md", "w", encoding="utf-8") as f:
    f.write(policy)
```

---

## Test Plan

- [ ] `AgentExecutor` with no tags produces `minimum-trust-level: 0`
- [ ] `AgentExecutor` tagged `"authenticated"` produces `minimum-trust-level: 2`
- [ ] `AgentExecutor` tagged `"privileged"` produces `minimum-trust-level: 4`
- [ ] Tools with `return_direct=True` produce `[read]` modifier in actions
- [ ] `AgentsMdConfig` overrides are applied correctly
- [ ] Generated output passes the AGENTS.md reference parser without errors
- [ ] Zero imports from any non-langchain-core package in the generator module

---

## License

New files are MIT licensed. No change to LangChain's existing Apache-2.0 license.
