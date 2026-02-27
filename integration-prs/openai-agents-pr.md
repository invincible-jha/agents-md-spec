<!-- SPDX-License-Identifier: CC-BY-SA-4.0 -->
<!-- Copyright (c) 2026 MuVeraAI Corporation -->

# Draft PR: Auto-generate AGENTS.md from OpenAI Agents SDK definitions

**Target repository:** `openai/openai-agents-python`
**Target branch:** `main`
**PR type:** Feature / Tooling
**Related spec:** [AGENTS-MD-SPEC-001](https://github.com/aumos-oss/agents-md-spec/blob/main/spec/AGENTS-MD-SPEC-001.md)

---

## Title

`feat: add generate_agents_md() — produce AGENTS.md policy from Agent, tools, and guardrails`

---

## Motivation

The OpenAI Agents SDK's `Agent` dataclass carries structured metadata — `name`,
`instructions`, `tools`, `handoffs`, and `output_guardrails` — that corresponds
naturally to AGENTS.md fields. This PR adds a `generate_agents_md()` utility that
reads these definitions and produces a valid AGENTS.md policy document, making it
easy for developers to publish a machine-readable capability manifest alongside
any deployed agent.

AGENTS.md is a vendor-neutral open standard:
https://github.com/aumos-oss/agents-md-spec (CC BY-SA 4.0)

Publishing AGENTS.md alongside an Agents SDK deployment:
- Communicates trust requirements to orchestrators before they route tasks.
- Surfaces guardrail constraints as machine-readable policy restrictions.
- Documents handoff paths so downstream systems understand delegation patterns.

---

## Changes

### New files

- `src/agents/extensions/agents_md/generator.py` — Core generation logic.
- `src/agents/extensions/agents_md/__init__.py` — Public re-exports.
- `tests/extensions/test_agents_md_generator.py` — Unit tests.

### No runtime changes

The generator is purely additive. It does not modify `Agent`, `Runner`, or any
existing SDK class. It reads from existing public attributes only.

---

## Mapping: OpenAI Agents SDK -> AGENTS.md

| SDK concept | AGENTS.md field |
|---|---|
| `Agent.name` | `## Identity` `site:` slug derived from name |
| `Agent.instructions` | Inline comment (first 120 chars) |
| `Agent.tools[*].name` | `## Actions` entry |
| `Agent.tools[*].description` | Action description |
| `Agent.handoffs` | `## Handoffs` section listing permitted delegate agents |
| Handoff `Agent.name` | Handoff target — requires `minimum-trust-level: 3` |
| `Agent.output_guardrails` | `## Restrictions` section entries |
| `Agent.input_guardrails` | `## Restrictions` section entries |
| Guardrail `name` | Restriction description |
| `Agent.model` | Comment only — not a policy field |

### Trust level derivation

| Condition | `minimum-trust-level` |
|---|---|
| No handoffs, no guardrails | `0` (Anonymous) |
| Has input guardrails only | `1` (Identified) |
| Has output guardrails | `2` (Verified) |
| Has handoffs to other agents | `3` (Authorized) |
| Guardrails block all non-explicit callers | `4` (Privileged) |

Trust level scale: `0` Anonymous, `1` Identified, `2` Verified,
`3` Authorized, `4` Privileged, `5` Administrative.

---

## Code Example

```python
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 MuVeraAI Corporation

"""
agents/extensions/agents_md/generator.py

Generate an AGENTS.md policy document from an OpenAI Agents SDK Agent.
Zero runtime dependencies beyond agents-core.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from agents import Agent


def _slugify(name: str) -> str:
    """Convert an agent name to a URL-safe identifier."""
    return re.sub(r"[^a-z0-9-]", "-", name.lower().strip()).strip("-")


def _tool_to_action_line(tool: object) -> str:
    """Format a single tool as an AGENTS.md action entry."""
    name: str = getattr(tool, "name", str(tool))
    description: str = (getattr(tool, "description", "") or "").replace("\n", " ")[:120]
    return f"- {name} [write]: {description}"


def _guardrail_to_restriction(guardrail: object, direction: str) -> str:
    """Format a guardrail as an AGENTS.md restriction entry."""
    name: str = getattr(guardrail, "name", str(guardrail))
    return f"- {direction}-guardrail:{name}"


def _resolve_trust_level(agent: Agent) -> int:
    """
    Derive the minimum trust level from agent configuration.

    Handoffs to other agents always require Authorized (3) because delegation
    implies elevated operational context. Guardrails without handoffs imply
    Verified (2) — the agent filters outputs, so identity matters. Input
    guardrails alone imply Identified (1).
    """
    has_handoffs = bool(getattr(agent, "handoffs", None))
    has_output_guardrails = bool(getattr(agent, "output_guardrails", None))
    has_input_guardrails = bool(getattr(agent, "input_guardrails", None))

    if has_handoffs:
        return 3
    if has_output_guardrails:
        return 2
    if has_input_guardrails:
        return 1
    return 0


@dataclass
class AgentsMdConfig:
    """Optional overrides for the generated AGENTS.md document."""

    site: str = ""
    contact: str = ""
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    concurrent_sessions: int = 3


def generate_agents_md(agent: Agent, config: AgentsMdConfig | None = None) -> str:
    """
    Generate an AGENTS.md policy document from an OpenAI Agents SDK Agent.

    Args:
        agent: A configured Agent instance.
        config: Optional overrides for site metadata and rate limits.

    Returns:
        A string containing a valid AGENTS.md document.
    """
    cfg = config or AgentsMdConfig()
    trust_level = _resolve_trust_level(agent)
    authentication = "required" if trust_level >= 2 else "none"
    site = cfg.site or _slugify(agent.name)
    contact_line = f"\n- contact: {cfg.contact}" if cfg.contact else ""

    # Instructions excerpt as a comment
    instructions_text = (getattr(agent, "instructions", "") or "")
    if callable(instructions_text):
        instructions_excerpt = "(dynamic instructions)"
    else:
        instructions_excerpt = str(instructions_text)[:120].replace("\n", " ")

    # Actions
    tools = list(getattr(agent, "tools", None) or [])
    action_lines = "\n".join(_tool_to_action_line(t) for t in tools)
    action_block = action_lines or "- (no tools registered)"

    # Restrictions from guardrails
    input_guardrails = list(getattr(agent, "input_guardrails", None) or [])
    output_guardrails = list(getattr(agent, "output_guardrails", None) or [])
    restriction_lines: list[str] = [
        _guardrail_to_restriction(g, "input") for g in input_guardrails
    ] + [
        _guardrail_to_restriction(g, "output") for g in output_guardrails
    ]
    restriction_block = "\n".join(restriction_lines) if restriction_lines else ""

    # Handoffs
    handoffs = list(getattr(agent, "handoffs", None) or [])
    handoff_lines: list[str] = []
    for handoff in handoffs:
        handoff_name = getattr(handoff, "name", str(handoff))
        handoff_lines.append(f"- {_slugify(handoff_name)}: minimum-trust-level 3")
    handoff_block = "\n".join(handoff_lines) if handoff_lines else ""

    sections: list[str] = [
        f"# AGENTS.md\n",
        f"# Agent: {agent.name}",
        f"# Instructions: {instructions_excerpt}",
        f"\n## Identity",
        f"- site: {site}{contact_line}",
        f"- last-updated: 2026-02-26",
        f"- spec-version: 1.0.0",
        f"\n## Trust Requirements",
        f"- minimum-trust-level: {trust_level}",
        f"- authentication: {authentication}",
        f"\n## Actions",
        action_block,
    ]

    if restriction_block:
        sections += [f"\n## Restrictions", restriction_block]

    if handoff_block:
        sections += [f"\n## Handoffs", handoff_block]

    sections += [
        f"\n## Rate Limits",
        f"- requests-per-minute: {cfg.requests_per_minute}",
        f"- requests-per-hour: {cfg.requests_per_hour}",
        f"- concurrent-sessions: {cfg.concurrent_sessions}",
        f"\n## Agent Identification",
        f"- require-agent-header: true",
        f"- require-disclosure: true",
    ]

    return "\n".join(sections) + "\n"
```

### Usage

```python
from agents import Agent, function_tool
from agents.extensions.agents_md import generate_agents_md, AgentsMdConfig

@function_tool
def search_knowledge_base(query: str) -> str:
    """Search the internal knowledge base."""
    ...

triage_agent = Agent(name="Triage Agent", instructions="Route user requests.")
research_agent = Agent(
    name="Research Agent",
    instructions="Answer questions using the knowledge base.",
    tools=[search_knowledge_base],
    handoffs=[triage_agent],
    output_guardrails=[my_content_filter],
)

policy = generate_agents_md(
    research_agent,
    AgentsMdConfig(site="research.my-app.com", contact="ai@my-app.com"),
)
with open("AGENTS.md", "w", encoding="utf-8") as f:
    f.write(policy)
```

---

## Test Plan

- [ ] Agent with no tools, no handoffs, no guardrails produces `minimum-trust-level: 0`
- [ ] Agent with input guardrails only produces `minimum-trust-level: 1`
- [ ] Agent with output guardrails produces `minimum-trust-level: 2`
- [ ] Agent with handoffs produces `minimum-trust-level: 3`
- [ ] Handoff section is omitted when `handoffs` is empty
- [ ] Restrictions section is omitted when no guardrails are present
- [ ] Dynamic instructions callable produces `(dynamic instructions)` comment
- [ ] Generated output passes the AGENTS.md reference parser without errors
- [ ] `AgentsMdConfig.site` override replaces the slugified agent name

---

## License

New files are MIT licensed. No change to the OpenAI Agents SDK's existing MIT license.
