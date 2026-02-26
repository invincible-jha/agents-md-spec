# AGENTS.md Specification Guide

This guide explains the AGENTS.md format in practical terms for site operators who want to publish a policy.

## What You Need to Know

An AGENTS.md file is a Markdown file with structured sections. You place it at the root of your website (`https://yoursite.com/AGENTS.md`) or in the well-known directory (`https://yoursite.com/.well-known/agents.md`).

The only required section is **Identity**. All other sections are optional and have sensible defaults when absent.

## Structure

```markdown
# AGENTS.md

## Identity
- site: yoursite.com
- contact: ai-policy@yoursite.com
- last-updated: 2026-03-15
```

Every directive follows the format: `- key: value`

## Section-by-Section Reference

### Identity (Required)

```markdown
## Identity
- site: yoursite.com
- contact: ai-policy@yoursite.com
- last-updated: 2026-03-15
- spec-version: 1.0.0
```

`site` is the only required key. It should be your domain name without the `https://` prefix.

### Trust Requirements

Controls what kind of agent can interact with your site.

```markdown
## Trust Requirements
- minimum-trust-level: 2
- authentication: required
- authentication-methods: oauth2, api-key
```

**Trust levels (0-5 scale):**
- `0` — Anonymous (no verification needed)
- `1` — Identified (agent has declared identity)
- `2` — Verified (identity confirmed, e.g., API key on file)
- `3` — Authorized (explicitly authorized by an administrator)
- `4` — Privileged (elevated permissions)
- `5` — Administrative (full access)

Most sites should use `0` (public content) or `2` (API access with key verification).

### Allowed Actions

Declares which categories of action agents may perform. Unspecified actions default to `false`, except `read-content` which defaults to `true`.

```markdown
## Allowed Actions
- read-content: true
- submit-forms: false
- make-purchases: false
- modify-account: false
- access-api: true
- download-files: true
- upload-files: false
- send-messages: false
- delete-data: false
- create-content: false
```

### Rate Limits

Declare limits on how many requests agents should make.

```markdown
## Rate Limits
- requests-per-minute: 30
- requests-per-hour: 500
- concurrent-sessions: 3
```

A value of `0` means no limit. Omitting a field means no limit for that dimension.

### Data Handling

Communicate your privacy practices to agents.

```markdown
## Data Handling
- personal-data-collection: minimal
- data-retention: session-only
- third-party-sharing: none
- gdpr-compliance: true
```

**Valid values:**
- `personal-data-collection`: `none`, `minimal`, `standard`, `extensive`
- `data-retention`: `none`, `session-only`, `30-days`, `1-year`, `indefinite`
- `third-party-sharing`: `none`, `anonymized`, `with-consent`, `unrestricted`

### Restrictions

Control which paths agents can access. Supports glob patterns.

```markdown
## Restrictions
- disallowed-paths: /admin/*, /internal/**, /staff/*
- require-human-approval: /checkout/*, /account/delete
- read-only-paths: /blog/*, /docs/**
```

**Pattern syntax:**
- `/exact` — Matches exactly this path
- `/prefix/*` — Matches `/prefix/` and one level below
- `/prefix/**` — Matches `/prefix/` and any depth below

### Agent Identification

Require agents to identify themselves.

```markdown
## Agent Identification
- require-agent-header: true
- agent-header-name: X-Agent-Identity
- require-disclosure: true
```

When `require-disclosure` is `true`, agents should inform the humans they interact with that they are AI.

## Boolean Values

All boolean fields accept: `true`, `false`, `yes`, `no`, `1`, `0`, `on`, `off` (case-insensitive).

## Comments

Lines starting with `#` are comments and are ignored:

```markdown
## Identity
# This is a comment — ignored by parsers
- site: example.com
```

## Extensions

You can add custom keys prefixed with `x-`:

```markdown
## Identity
- site: example.com
- x-internal-policy-id: POL-2026-001
```

Parsers must not reject files with `x-` prefixed keys.
