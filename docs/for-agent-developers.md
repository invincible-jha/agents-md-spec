# AGENTS.md — Guide for Agent Developers

This guide explains how to integrate AGENTS.md policy checking into your AI agent framework.

## Overview

Before your agent interacts with any website, it should:

1. Fetch the AGENTS.md policy from the site.
2. Check whether the agent's trust level meets the minimum required.
3. Verify the desired action is permitted.
4. Respect rate limits.
5. Respect path-level restrictions.
6. Send the required identification headers if requested.

## Quick Integration

### TypeScript / JavaScript

```typescript
import { fetchPolicy, validate } from 'agents-md';

async function checkSitePolicy(siteUrl: string, agentTrustLevel: number): Promise<boolean> {
  const result = await fetchPolicy(siteUrl);

  // No policy found — site is permissive by default.
  if (!result) return true;

  if (!result.success || !result.policy) {
    console.warn('Failed to parse AGENTS.md:', result.errors);
    // Fail open or closed depending on your agent's risk posture.
    return false;
  }

  const policy = result.policy;
  const validation = validate(policy);
  if (!validation.valid) {
    console.warn('Invalid AGENTS.md policy:', validation.errors);
    return false;
  }

  // Check trust level.
  if (agentTrustLevel < policy.trustRequirements.minimumTrustLevel) {
    console.log(
      `Trust level ${agentTrustLevel} insufficient. Site requires ${policy.trustRequirements.minimumTrustLevel}.`
    );
    return false;
  }

  return true;
}
```

### Python

```python
from agents_md import fetch_policy, validate

async def check_site_policy(site_url: str, agent_trust_level: int) -> bool:
    result = await fetch_policy(site_url)

    if result is None:
        return True  # No policy — permissive by default.

    if not result.success or result.policy is None:
        print(f"Failed to parse AGENTS.md: {result.errors}")
        return False

    policy = result.policy
    validation = validate(policy)
    if not validation.valid:
        print(f"Invalid AGENTS.md policy: {validation.errors}")
        return False

    if agent_trust_level < policy.trust_requirements.minimum_trust_level:
        print(
            f"Trust level {agent_trust_level} insufficient. "
            f"Site requires {policy.trust_requirements.minimum_trust_level}."
        )
        return False

    return True
```

## Checking Specific Actions

Before performing any action, check whether it is permitted:

```typescript
function isActionPermitted(policy: AgentsPolicy, action: string): boolean {
  // readContent defaults to true; all others default to false.
  const defaultValue = action === 'readContent';
  return policy.allowedActions[action] ?? defaultValue;
}

// Usage:
if (!isActionPermitted(policy, 'makePurchases')) {
  throw new Error('Site does not permit purchase actions by AI agents.');
}
```

## Checking Path Restrictions

Before accessing a URL, check the restrictions:

```typescript
function matchesGlob(pattern: string, path: string): boolean {
  // Simple glob matching — replace * with [^/]+ and ** with .+
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex chars
    .replace(/\*\*/g, '.+')
    .replace(/\*/g, '[^/]+');
  return new RegExp(`^${regexStr}$`).test(path);
}

function checkPathRestrictions(
  policy: AgentsPolicy,
  urlPath: string,
  intendedAction: 'read' | 'write'
): { allowed: boolean; requiresHumanApproval: boolean } {
  const { disallowedPaths, requireHumanApproval, readOnlyPaths } = policy.restrictions;

  // Check disallowed paths first (highest precedence).
  if (disallowedPaths.some((pattern) => matchesGlob(pattern, urlPath))) {
    return { allowed: false, requiresHumanApproval: false };
  }

  // Check if human approval is required.
  const needsApproval = requireHumanApproval.some((pattern) =>
    matchesGlob(pattern, urlPath)
  );

  // Check read-only restriction for write operations.
  if (intendedAction === 'write' && readOnlyPaths.some((pattern) =>
    matchesGlob(pattern, urlPath)
  )) {
    return { allowed: false, requiresHumanApproval: false };
  }

  return { allowed: true, requiresHumanApproval: needsApproval };
}
```

## Rate Limiting

Implement a token bucket or similar algorithm to honor declared rate limits:

```typescript
class RateLimiter {
  private requestsThisMinute = 0;
  private requestsThisHour = 0;
  private lastMinuteReset = Date.now();
  private lastHourReset = Date.now();

  canMakeRequest(rateLimits: RateLimits): boolean {
    const now = Date.now();

    if (now - this.lastMinuteReset > 60_000) {
      this.requestsThisMinute = 0;
      this.lastMinuteReset = now;
    }
    if (now - this.lastHourReset > 3_600_000) {
      this.requestsThisHour = 0;
      this.lastHourReset = now;
    }

    if (rateLimits.requestsPerMinute && this.requestsThisMinute >= rateLimits.requestsPerMinute) {
      return false;
    }
    if (rateLimits.requestsPerHour && this.requestsThisHour >= rateLimits.requestsPerHour) {
      return false;
    }

    this.requestsThisMinute++;
    this.requestsThisHour++;
    return true;
  }
}
```

## Sending Required Headers

When `requireAgentHeader` is `true`, send the specified header with every request:

```typescript
function buildAgentHeaders(policy: AgentsPolicy, agentIdentity: string): Record<string, string> {
  const headers: Record<string, string> = {};

  if (policy.agentIdentification.requireAgentHeader) {
    const headerName = policy.agentIdentification.agentHeaderName ?? 'X-Agent-Identity';
    headers[headerName] = agentIdentity;
  }

  return headers;
}
```

## Caching Policies

Cache fetched policies to avoid fetching on every request:

```typescript
class PolicyCache {
  private cache = new Map<string, { policy: ParseResult; fetchedAt: number }>();
  private readonly maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours

  async getPolicy(baseUrl: string): Promise<ParseResult | null> {
    const cached = this.cache.get(baseUrl);
    if (cached && Date.now() - cached.fetchedAt < this.maxAgeMs) {
      return cached.policy;
    }

    const policy = await fetchPolicy(baseUrl);
    if (policy) {
      this.cache.set(baseUrl, { policy, fetchedAt: Date.now() });
    }
    return policy;
  }
}
```

## Handling Missing Policies

When no AGENTS.md is found, apply permissive defaults — this is intentional by design. Most sites will not have an AGENTS.md initially. Your agent should:

- Treat `readContent` as `true`
- Treat all other actions as `false` (conservative default for agent actions)
- Apply your own rate limiting heuristics
- Identify itself as an agent unless there's a reason not to

## Conflict Resolution

When a user's configuration and a site's AGENTS.md conflict, the more restrictive policy MUST take precedence. If a user says "you can make purchases on any site" but the site's AGENTS.md says `make-purchases: false`, honor the site's restriction.
