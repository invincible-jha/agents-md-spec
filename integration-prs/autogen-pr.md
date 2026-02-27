<!-- SPDX-License-Identifier: CC-BY-SA-4.0 -->
<!-- Copyright (c) 2026 MuVeraAI Corporation -->

# Draft PR: Auto-generate AGENTS.md from Microsoft AutoGen agent definitions

**Target repository:** `microsoft/autogen`
**Target branch:** `main`
**PR type:** Feature / Tooling
**Related spec:** [AGENTS-MD-SPEC-001](https://github.com/aumos-oss/agents-md-spec/blob/main/spec/AGENTS-MD-SPEC-001.md)

---

## Title

`feat(autogen-agentchat): add generate_agents_md() — derive AGENTS.md from ConversableAgent and GroupChat`

---

## Motivation

AutoGen's `ConversableAgent` carries structured metadata — `name`, `description`,
`system_message`, `function_map`, and `llm_config` — that maps directly to AGENTS.md
policy fields. GroupChat configurations encode multi-agent trust relationships that
correspond to AGENTS.md trust levels and delegation constraints.

Publishing an AGENTS.md file alongside an AutoGen deployment enables:
- Orchestrators to discover what functions a group chat exposes before routing.
- Operators to enforce trust policies at the point where human approval is required.
- Downstream systems to read machine-readable rate limits before batching requests.

AGENTS.md spec: https://github.com/aumos-oss/agents-md-spec (CC BY-SA 4.0)

---

## Changes

### New files

- `python/packages/autogen-agentchat/src/autogen_agentchat/agents_md/generator.py`
  — Core generation logic.
- `python/packages/autogen-agentchat/src/autogen_agentchat/agents_md/__init__.py`
  — Public re-exports.
- `python/packages/autogen-agentchat/tests/test_agents_md_generator.py`
  — Unit tests (pytest).

### No runtime changes

The generator is purely additive. It reads from existing public attributes on
`ConversableAgent` and `GroupChat`. No monkey-patching, no changes to agent
initialization or message routing.

---

## Mapping: AutoGen -> AGENTS.md

### ConversableAgent mapping

| AutoGen `ConversableAgent` attribute | AGENTS.md field |
|---|---|
| `agent.name` | `## Identity` `site:` slug derived from name |
| `agent.description` | Inline comment |
| `agent.system_message` | Inline comment (first 120 chars) |
| `agent.function_map.keys()` | `## Actions` entries (all `[write]`) |
| `agent.human_input_mode == "ALWAYS"` | `require-human-approval: /*` |
| `agent.human_input_mode == "NEVER"` | Trust level 0 (no human gate) |
| `agent.human_input_mode == "TERMINATE"` | Trust level 1 (identified) |
| `agent.max_consecutive_auto_reply` | `requests-per-minute` (derived) |

### GroupChat mapping

| AutoGen `GroupChat` / `GroupChatManager` | AGENTS.md field |
|---|---|
| `groupchat.agents` | One subsection per agent |
| `groupchat.max_round` | `requests-per-hour` (derived: `max_round * agents`) |
| `groupchat.speaker_selection_method` | Trust level — `"auto"` = 1, `"round_robin"` = 0, `"random"` = 0 |
| `groupchat.allow_repeat_speaker` | `concurrent-sessions` modifier |

Trust level scale: `0` Anonymous, `1` Identified, `2` Verified,
`3` Authorized, `4` Privileged, `5` Administrative.

---

## Code Example

```python
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 MuVeraAI Corporation

"""
autogen_agentchat/agents_md/generator.py

Generate an AGENTS.md policy document from AutoGen ConversableAgent and GroupChat.
Zero runtime dependencies beyond autogen-agentchat.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from autogen import ConversableAgent, GroupChat


def _slugify(name: str) -> str:
    """Convert an agent name to a URL-safe identifier."""
    return re.sub(r"[^a-z0-9-]", "-", name.lower().strip()).strip("-")


def _function_to_action_line(function_name: str) -> str:
    """Format a registered function name as an AGENTS.md action entry."""
    return f"- {function_name} [write]: registered function tool"


def _resolve_trust_level_from_human_mode(human_input_mode: str) -> int:
    """
    Map AutoGen human input mode to a generic trust level.

    ALWAYS: Every action needs human approval — Authorized (3).
    TERMINATE: Human reviews at termination — Identified (1).
    NEVER: Fully autonomous — Anonymous (0).
    """
    mode = human_input_mode.upper()
    if mode == "ALWAYS":
        return 3
    if mode == "TERMINATE":
        return 1
    return 0


def _resolve_trust_level_for_groupchat(speaker_selection_method: str) -> int:
    """
    Map GroupChat speaker selection to a trust level.

    Automatic selection involves LLM-driven routing — Identified (1).
    Round-robin and random are structural only — Anonymous (0).
    """
    method = str(speaker_selection_method).lower()
    if method == "auto":
        return 1
    return 0


@dataclass
class AgentsMdConfig:
    """Optional overrides for the generated AGENTS.md document."""

    site: str = ""
    contact: str = ""
    requests_per_minute: int = 30
    requests_per_hour: int = 500
    concurrent_sessions: int = 1


def generate_agents_md_for_agent(
    agent: ConversableAgent,
    config: AgentsMdConfig | None = None,
) -> str:
    """
    Generate an AGENTS.md document from a single AutoGen ConversableAgent.

    Args:
        agent: A configured ConversableAgent instance.
        config: Optional overrides for site metadata and rate limits.

    Returns:
        A string containing a valid AGENTS.md document.
    """
    cfg = config or AgentsMdConfig()
    human_input_mode: str = getattr(agent, "human_input_mode", "TERMINATE")
    trust_level = _resolve_trust_level_from_human_mode(human_input_mode)
    authentication = "required" if trust_level >= 2 else "none"

    site = cfg.site or _slugify(agent.name)
    contact_line = f"\n- contact: {cfg.contact}" if cfg.contact else ""

    description: str = (getattr(agent, "description", "") or "")[:120].replace("\n", " ")
    system_message: str = (getattr(agent, "system_message", "") or "")[:120].replace("\n", " ")

    function_map: dict[str, object] = dict(getattr(agent, "function_map", None) or {})
    action_lines = "\n".join(_function_to_action_line(fn) for fn in function_map)
    action_block = action_lines or "- (no functions registered)"

    require_human_approval_line = ""
    if human_input_mode.upper() == "ALWAYS":
        require_human_approval_line = "\n- require-human-approval: /*"

    max_auto_reply: int = getattr(agent, "max_consecutive_auto_reply", 10) or 10
    requests_per_minute = min(cfg.requests_per_minute, max_auto_reply * 2)

    return f"""# AGENTS.md

# Agent: {agent.name}
# Description: {description}
# System message: {system_message}

## Identity
- site: {site}{contact_line}
- last-updated: 2026-02-26
- spec-version: 1.0.0

## Trust Requirements
- minimum-trust-level: {trust_level}
- authentication: {authentication}

## Actions
{action_block}

## Rate Limits
- requests-per-minute: {requests_per_minute}
- requests-per-hour: {cfg.requests_per_hour}
- concurrent-sessions: {cfg.concurrent_sessions}

## Restrictions{require_human_approval_line}
- disallowed-paths: /admin/*

## Agent Identification
- require-agent-header: true
- require-disclosure: true
"""


def generate_agents_md_for_groupchat(
    groupchat: GroupChat,
    config: AgentsMdConfig | None = None,
) -> str:
    """
    Generate a multi-agent AGENTS.md document from an AutoGen GroupChat.

    Args:
        groupchat: A configured GroupChat instance.
        config: Optional overrides for site metadata and rate limits.

    Returns:
        A string containing a valid AGENTS.md document.
    """
    cfg = config or AgentsMdConfig()
    selection_method: str = str(
        getattr(groupchat, "speaker_selection_method", "round_robin")
    )
    trust_level = _resolve_trust_level_for_groupchat(selection_method)
    max_round: int = getattr(groupchat, "max_round", 10) or 10
    agents: list[ConversableAgent] = list(getattr(groupchat, "agents", None) or [])
    requests_per_hour = min(cfg.requests_per_hour, max_round * max(len(agents), 1))
    site = cfg.site or "autogen-groupchat"
    contact_line = f"\n- contact: {cfg.contact}" if cfg.contact else ""

    agent_sections: list[str] = []
    for agent in agents:
        slug = _slugify(agent.name)
        function_map = dict(getattr(agent, "function_map", None) or {})
        fn_lines = "\n".join(f"  {_function_to_action_line(fn)}" for fn in function_map)
        fn_block = fn_lines or "  - (no functions)"
        agent_sections.append(
            f"### Agent: {agent.name}\n"
            f"- agent-id: {slug}\n"
            f"- functions:\n{fn_block}"
        )

    agents_block = "\n\n".join(agent_sections) if agent_sections else "- (no agents)"

    return f"""# AGENTS.md

## Identity
- site: {site}{contact_line}
- last-updated: 2026-02-26
- spec-version: 1.0.0

## Trust Requirements
- minimum-trust-level: {trust_level}
- authentication: none

## Group Chat Composition
- speaker-selection: {selection_method}
- max-rounds: {max_round}

{agents_block}

## Rate Limits
- requests-per-minute: {cfg.requests_per_minute}
- requests-per-hour: {requests_per_hour}
- concurrent-sessions: {cfg.concurrent_sessions}

## Agent Identification
- require-agent-header: true
- require-disclosure: true
"""
```

### Usage

```python
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager
from autogen_agentchat.agents_md import (
    generate_agents_md_for_agent,
    generate_agents_md_for_groupchat,
    AgentsMdConfig,
)

assistant = AssistantAgent(
    name="assistant",
    system_message="You are a helpful AI assistant.",
    function_map={"search": search_fn, "calculate": calc_fn},
)

user_proxy = UserProxyAgent(
    name="user_proxy",
    human_input_mode="TERMINATE",
)

groupchat = GroupChat(
    agents=[assistant, user_proxy],
    messages=[],
    max_round=20,
    speaker_selection_method="auto",
)

# Single-agent policy
policy = generate_agents_md_for_agent(
    assistant,
    AgentsMdConfig(site="assistant.my-app.com"),
)

# Group chat policy
group_policy = generate_agents_md_for_groupchat(
    groupchat,
    AgentsMdConfig(site="groupchat.my-app.com", contact="ai@my-app.com"),
)
```

---

## Test Plan

- [ ] `human_input_mode="NEVER"` produces `minimum-trust-level: 0`
- [ ] `human_input_mode="TERMINATE"` produces `minimum-trust-level: 1`
- [ ] `human_input_mode="ALWAYS"` produces `minimum-trust-level: 3` and `require-human-approval: /*`
- [ ] `function_map` with two functions produces two `[write]` action lines
- [ ] Empty `function_map` produces `(no functions registered)`
- [ ] GroupChat with `speaker_selection_method="auto"` produces `minimum-trust-level: 1`
- [ ] GroupChat `max_round` caps `requests_per_hour` derivation correctly
- [ ] Each agent in GroupChat appears in its own `### Agent:` subsection
- [ ] Generated output passes the AGENTS.md reference parser without errors

---

## License

New files are MIT licensed. No change to AutoGen's existing MIT license (CC-BY-NC-SA
for documentation; MIT for code).
