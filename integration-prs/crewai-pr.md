<!-- SPDX-License-Identifier: CC-BY-SA-4.0 -->
<!-- Copyright (c) 2026 MuVeraAI Corporation -->

# Draft PR: Auto-generate AGENTS.md from CrewAI Crew and Agent definitions

**Target repository:** `crewAIInc/crewAI`
**Target branch:** `main`
**PR type:** Feature / Tooling
**Related spec:** [AGENTS-MD-SPEC-001](https://github.com/aumos-oss/agents-md-spec/blob/main/spec/AGENTS-MD-SPEC-001.md)

---

## Title

`feat: add generate_agents_md() for Crew and Agent — publish AGENTS.md policy from crew definitions`

---

## Motivation

CrewAI's `Agent` model carries rich semantic metadata — `role`, `goal`, `backstory`,
`tools`, and `allow_delegation` — that maps directly to AGENTS.md fields. Publishing
an AGENTS.md file for a deployed CrewAI crew communicates its capabilities and
trust requirements to any system that interacts with it, enabling operator-defined
policy enforcement without changing agent runtime behavior.

AGENTS.md is a vendor-neutral open standard hosted at:
https://github.com/aumos-oss/agents-md-spec (CC BY-SA 4.0)

**Use cases for CrewAI teams:**
- Publish a crew's capability manifest alongside a CrewAI Serve deployment.
- Let orchestration layers discover what a crew can and cannot do before routing tasks.
- Satisfy enterprise policy requirements that mandate machine-readable agent declarations.

---

## Changes

### New files

- `src/crewai/utilities/agents_md/generator.py` — Core generation logic.
- `src/crewai/utilities/agents_md/__init__.py` — Public re-exports.
- `tests/utilities/test_agents_md_generator.py` — Unit tests.

### No runtime changes

The generator is a standalone utility. It reads `Crew` and `Agent` instances using
their existing public attributes and produces a string. No monkey-patching, no
changes to `Crew.__init__` or `Agent.__init__`.

---

## Mapping: CrewAI -> AGENTS.md

### Agent-level mapping

| CrewAI `Agent` attribute | AGENTS.md field |
|---|---|
| `agent.role` | `## Identity` `site:` slug derived from role |
| `agent.goal` | Inline description comment |
| `agent.backstory` | Inline comment (first 120 chars) |
| `agent.tools[*].name` | `## Actions` entry |
| `agent.tools[*].description` | Action description |
| `agent.allow_delegation` | Adds `delegate-to-agents: true` in `## Agent Identification` |
| `agent.verbose` | No mapping — internal only |

### Crew-level mapping (multi-agent)

| CrewAI `Crew` attribute | AGENTS.md field |
|---|---|
| `crew.agents` | One `## Agent: {role}` subsection per agent |
| `crew.tasks` | Referenced in per-agent action lists |
| `crew.process` (sequential/hierarchical) | `minimum-trust-level` — hierarchical = 3, sequential = 1 |
| `crew.share_crew` | `third-party-sharing: with-consent` when `True` |

Trust level scale: `0` Anonymous, `1` Identified, `2` Verified,
`3` Authorized, `4` Privileged, `5` Administrative.

---

## Code Example

```python
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 MuVeraAI Corporation

"""
crewai/utilities/agents_md/generator.py

Generate an AGENTS.md policy document from a CrewAI Crew or Agent.
Zero runtime dependencies beyond crewai itself.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from crewai import Agent, Crew
    from crewai.utilities.constants import Process


def _slugify(text: str) -> str:
    """Convert a role string to a URL-safe slug."""
    return re.sub(r"[^a-z0-9-]", "-", text.lower().strip()).strip("-")


def _tool_line(tool: object) -> str:
    """Render a single tool as an AGENTS.md action entry."""
    name: str = getattr(tool, "name", str(tool))
    description: str = (getattr(tool, "description", "") or "").replace("\n", " ")[:120]
    return f"- {name}: {description}"


@dataclass
class AgentsMdConfig:
    """Optional overrides for the generated AGENTS.md document."""

    site: str = ""
    contact: str = ""
    requests_per_minute: int = 30
    requests_per_hour: int = 500


def _trust_level_for_process(process: object) -> int:
    """
    Map CrewAI process type to a generic trust level.

    Hierarchical crews coordinate sub-agents and require Authorized (3).
    Sequential crews operate linearly and require Identified (1).
    """
    process_name = str(process).lower()
    if "hierarchical" in process_name:
        return 3
    return 1


def generate_agents_md_for_agent(agent: Agent, config: AgentsMdConfig | None = None) -> str:
    """Generate an AGENTS.md document from a single CrewAI Agent."""
    cfg = config or AgentsMdConfig()
    site = cfg.site or _slugify(agent.role)
    backstory_excerpt = (agent.backstory or "")[:120].replace("\n", " ")
    action_lines = "\n".join(_tool_line(t) for t in (agent.tools or []))
    action_block = action_lines or "- (no tools registered)"
    delegation_line = (
        "\n- delegate-to-agents: true" if agent.allow_delegation else ""
    )
    contact_line = f"\n- contact: {cfg.contact}" if cfg.contact else ""

    return f"""# AGENTS.md

# Agent role: {agent.role}
# Goal: {agent.goal}
# Backstory: {backstory_excerpt}

## Identity
- site: {site}{contact_line}
- last-updated: 2026-02-26
- spec-version: 1.0.0

## Trust Requirements
- minimum-trust-level: 1
- authentication: none

## Actions
{action_block}

## Rate Limits
- requests-per-minute: {cfg.requests_per_minute}
- requests-per-hour: {cfg.requests_per_hour}

## Agent Identification
- require-agent-header: true
- require-disclosure: true{delegation_line}
"""


def generate_agents_md_for_crew(crew: Crew, config: AgentsMdConfig | None = None) -> str:
    """Generate a multi-agent AGENTS.md document from a CrewAI Crew."""
    cfg = config or AgentsMdConfig()
    trust_level = _trust_level_for_process(getattr(crew, "process", "sequential"))
    sharing = "with-consent" if getattr(crew, "share_crew", False) else "none"
    site = cfg.site or "crewai-crew"
    contact_line = f"\n- contact: {cfg.contact}" if cfg.contact else ""

    agent_sections: list[str] = []
    for agent in crew.agents:
        slug = _slugify(agent.role)
        action_lines = "\n".join(f"  {_tool_line(t)}" for t in (agent.tools or []))
        action_block = action_lines or "  - (no tools)"
        agent_sections.append(
            f"### Agent: {agent.role}\n"
            f"- agent-id: {slug}\n"
            f"- allow-delegation: {str(agent.allow_delegation).lower()}\n"
            f"- actions:\n{action_block}"
        )

    agents_block = "\n\n".join(agent_sections) if agent_sections else "- (no agents)"

    return f"""# AGENTS.md

## Identity
- site: {site}{contact_line}
- last-updated: 2026-02-26
- spec-version: 1.0.0

## Trust Requirements
- minimum-trust-level: {trust_level}
- authentication: required

## Crew Composition
{agents_block}

## Rate Limits
- requests-per-minute: {cfg.requests_per_minute}
- requests-per-hour: {cfg.requests_per_hour}

## Data Handling
- third-party-sharing: {sharing}

## Agent Identification
- require-agent-header: true
- require-disclosure: true
"""
```

### Usage

```python
from crewai import Agent, Crew, Task, Process
from crewai.utilities.agents_md import generate_agents_md_for_crew

researcher = Agent(role="Researcher", goal="Find facts", backstory="...", tools=[search])
writer = Agent(role="Writer", goal="Write reports", backstory="...", tools=[])

crew = Crew(
    agents=[researcher, writer],
    tasks=[...],
    process=Process.hierarchical,
)

policy = generate_agents_md_for_crew(crew)
with open("AGENTS.md", "w", encoding="utf-8") as f:
    f.write(policy)
```

---

## Test Plan

- [ ] Single `Agent` with no tools produces a valid AGENTS.md with empty action block
- [ ] `allow_delegation=True` produces `delegate-to-agents: true` line
- [ ] Hierarchical `Crew` produces `minimum-trust-level: 3`
- [ ] Sequential `Crew` produces `minimum-trust-level: 1`
- [ ] `share_crew=True` produces `third-party-sharing: with-consent`
- [ ] Each agent in crew produces a `### Agent:` subsection
- [ ] Generated output passes the AGENTS.md reference parser without errors
- [ ] `_slugify` correctly handles Unicode and special characters in role names

---

## License

New files are MIT licensed. No change to CrewAI's existing MIT license.
