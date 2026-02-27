<!-- SPDX-License-Identifier: CC-BY-SA-4.0 -->
<!-- Copyright (c) 2026 MuVeraAI Corporation -->

# Draft PR: Auto-generate AGENTS.md from Vercel AI SDK tool definitions

**Target repository:** `vercel/ai`
**Target branch:** `main`
**PR type:** Feature / Tooling
**Related spec:** [AGENTS-MD-SPEC-001](https://github.com/aumos-oss/agents-md-spec/blob/main/spec/AGENTS-MD-SPEC-001.md)

---

## Title

`feat(ai): add generateAgentsMd() utility — derive AGENTS.md from streamText and generateObject tool definitions`

---

## Motivation

Vercel AI SDK's `tool()` helper and `streamText`/`generateObject` functions accept
structured tool definitions — `description`, `parameters` (Zod schema), and
`execute` function. This structured metadata maps directly to AGENTS.md `## Actions`
entries. The `maxSteps` parameter maps to rate limiting. Authentication status on
the Next.js route handler maps to trust level requirements.

Publishing an AGENTS.md file for an AI SDK-powered route communicates:
- Which tools the agent can invoke on behalf of a user.
- Rate limiting expectations for orchestrators calling this endpoint.
- Trust and authentication requirements before the agent proceeds.

AGENTS.md spec: https://github.com/aumos-oss/agents-md-spec (CC BY-SA 4.0)

---

## Changes

### New files

- `packages/ai/src/agents-md/generate-agents-md.ts` — Core generation function.
- `packages/ai/src/agents-md/index.ts` — Re-exports.
- `packages/ai/src/agents-md/types.ts` — Configuration types.
- `packages/ai/src/agents-md/generate-agents-md.test.ts` — Vitest tests.

### No changes to existing files

The generator is purely additive. It does not modify `streamText`, `generateObject`,
or any existing AI SDK function signatures.

---

## Mapping: Vercel AI SDK -> AGENTS.md

| AI SDK concept | AGENTS.md field |
|---|---|
| `tool(description, ...)` | `## Actions` entry with description |
| `tool.parameters` (Zod schema) | Action parameters list (key names only) |
| `tool.execute` presence | Action is `write`; absence = `read` |
| `maxSteps` in `streamText` | `requests-per-minute` (derived: `maxSteps * calls/min`) |
| Route handler `auth` option | `minimum-trust-level` (none=0, required=2) |
| `maxRetries` | `concurrent-sessions` (approximation) |

Trust level scale: `0` Anonymous, `1` Identified, `2` Verified,
`3` Authorized, `4` Privileged, `5` Administrative.

---

## Code Example

```typescript
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 MuVeraAI Corporation

/**
 * packages/ai/src/agents-md/generate-agents-md.ts
 *
 * Generates an AGENTS.md policy document from Vercel AI SDK tool definitions.
 * Zero runtime dependencies beyond the `ai` package itself.
 */

import { z } from "zod";

/** A tool definition as accepted by streamText/generateObject. */
export interface ToolDefinition {
  readonly description: string;
  readonly parameters: z.ZodTypeAny;
  readonly execute?: (...args: unknown[]) => Promise<unknown>;
}

export interface AgentsMdConfig {
  /** The domain name or agent identifier for the Identity section. */
  readonly site: string;
  /** Contact email for AI policy inquiries. */
  readonly contact?: string;
  /**
   * Trust level required to call this agent.
   * 0 Anonymous | 1 Identified | 2 Verified | 3 Authorized | 4 Privileged | 5 Administrative
   */
  readonly minimumTrustLevel?: 0 | 1 | 2 | 3 | 4 | 5;
  /** Whether authentication is required. Defaults to 'none'. */
  readonly authentication?: "required" | "optional" | "none";
  /** Maximum requests per minute the agent should accept. */
  readonly requestsPerMinute?: number;
  /** Maximum requests per hour. */
  readonly requestsPerHour?: number;
  /** Maximum concurrent sessions. */
  readonly concurrentSessions?: number;
  /** Whether to require X-Agent-Identity header from callers. */
  readonly requireAgentHeader?: boolean;
}

function extractZodKeys(schema: z.ZodTypeAny): readonly string[] {
  if (schema instanceof z.ZodObject) {
    return Object.keys(schema.shape as Record<string, unknown>);
  }
  return [];
}

function toolToActionLine(name: string, tool: ToolDefinition): string {
  const modifier = tool.execute !== undefined ? "write" : "read";
  const paramKeys = extractZodKeys(tool.parameters);
  const paramHint =
    paramKeys.length > 0 ? ` (params: ${paramKeys.join(", ")})` : "";
  const description = tool.description.replace(/\n/g, " ").slice(0, 120);
  return `- ${name} [${modifier}]: ${description}${paramHint}`;
}

/**
 * Generate an AGENTS.md policy document from Vercel AI SDK tool definitions.
 *
 * @param tools - Record of tool name to tool definition, matching the shape
 *   accepted by streamText({ tools }) and generateObject({ tools }).
 * @param config - Site metadata and policy overrides.
 * @returns A string containing a valid AGENTS.md document.
 */
export function generateAgentsMd(
  tools: Readonly<Record<string, ToolDefinition>>,
  config: AgentsMdConfig
): string {
  const trustLevel = config.minimumTrustLevel ?? 0;
  const authentication = config.authentication ?? (trustLevel >= 2 ? "required" : "none");
  const requestsPerMinute = config.requestsPerMinute ?? 60;
  const requestsPerHour = config.requestsPerHour ?? 1000;
  const concurrentSessions = config.concurrentSessions ?? 3;
  const requireAgentHeader = config.requireAgentHeader ?? true;
  const contactLine = config.contact ? `\n- contact: ${config.contact}` : "";

  const actionLines = Object.entries(tools)
    .map(([name, tool]) => toolToActionLine(name, tool))
    .join("\n");
  const actionBlock = actionLines || "- (no tools registered)";

  return `# AGENTS.md

## Identity
- site: ${config.site}${contactLine}
- last-updated: 2026-02-26
- spec-version: 1.0.0

## Trust Requirements
- minimum-trust-level: ${trustLevel}
- authentication: ${authentication}

## Actions
${actionBlock}

## Rate Limits
- requests-per-minute: ${requestsPerMinute}
- requests-per-hour: ${requestsPerHour}
- concurrent-sessions: ${concurrentSessions}

## Agent Identification
- require-agent-header: ${requireAgentHeader}
- require-disclosure: true
`;
}
```

### Usage in a Next.js Route Handler

```typescript
// app/api/agent/agents-md/route.ts
import { generateAgentsMd } from "ai/agents-md";
import { agentTools } from "../tools";

export function GET(): Response {
  const policy = generateAgentsMd(agentTools, {
    site: "my-app.vercel.app",
    contact: "ai-policy@my-app.com",
    minimumTrustLevel: 2,
    authentication: "required",
    requestsPerMinute: 20,
    requestsPerHour: 500,
    concurrentSessions: 5,
  });

  return new Response(policy, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
```

### Usage with streamText

```typescript
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { generateAgentsMd } from "ai/agents-md";
import { z } from "zod";

const tools = {
  searchWeb: {
    description: "Search the web for current information.",
    parameters: z.object({ query: z.string() }),
    execute: async ({ query }) => { /* ... */ },
  },
  readDocument: {
    description: "Read a document by URL.",
    parameters: z.object({ url: z.string().url() }),
    // No execute — read-only tool
  },
};

// In your route handler:
const result = await streamText({ model: openai("gpt-4o"), tools, maxSteps: 5 });

// Generate policy from the same tool definitions:
const policy = generateAgentsMd(tools, { site: "api.example.com", minimumTrustLevel: 1 });
```

---

## Test Plan

- [ ] Tool with `execute` produces `[write]` modifier; without `execute` produces `[read]`
- [ ] Zod object schemas extract parameter key names correctly
- [ ] `minimumTrustLevel: 2` produces `authentication: required` when not overridden
- [ ] `minimumTrustLevel: 0` produces `authentication: none` when not overridden
- [ ] Custom `authentication` override takes precedence over derived value
- [ ] Empty tool record produces `(no tools registered)` action block
- [ ] Generated output passes the AGENTS.md reference parser without errors
- [ ] TypeScript strict mode passes (`noImplicitAny`, `strictNullChecks`)

---

## License

New files are MIT licensed. No change to Vercel AI SDK's existing Apache-2.0 license.
