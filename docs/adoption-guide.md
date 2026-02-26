# AGENTS.md Adoption Guide

This guide helps site operators create and publish an AGENTS.md file in under 10 minutes.

## Step 1: Choose Your Policy Level

Before writing your file, decide what kind of AI agent interaction you want to support:

### Option A: Read-Only Public Site (blog, docs, marketing)

Agents can read your content but cannot take any actions. No authentication required.

```markdown
# AGENTS.md

## Identity
- site: yourdomain.com
- contact: webmaster@yourdomain.com
- last-updated: 2026-03-15

## Trust Requirements
- minimum-trust-level: 0
- authentication: none

## Allowed Actions
- read-content: true

## Rate Limits
- requests-per-minute: 20
- requests-per-hour: 200
```

### Option B: API-Accessible Platform (SaaS, developer tools)

Agents can access your API with a valid API key.

```markdown
# AGENTS.md

## Identity
- site: api.yourdomain.com
- contact: api-support@yourdomain.com
- last-updated: 2026-03-15

## Trust Requirements
- minimum-trust-level: 2
- authentication: required
- authentication-methods: api-key, bearer

## Allowed Actions
- read-content: true
- access-api: true
- create-content: true

## Rate Limits
- requests-per-minute: 60
- requests-per-hour: 1000
- concurrent-sessions: 5

## Agent Identification
- require-agent-header: true
- agent-header-name: X-Agent-Identity
```

### Option C: High-Security Site (healthcare, financial, government)

Strict access controls, human approval required for sensitive operations.

```markdown
# AGENTS.md

## Identity
- site: secure.yourdomain.com
- contact: security@yourdomain.com
- last-updated: 2026-03-15

## Trust Requirements
- minimum-trust-level: 3
- authentication: required
- authentication-methods: oauth2

## Allowed Actions
- read-content: true
- submit-forms: false
- make-purchases: false
- modify-account: false

## Rate Limits
- requests-per-minute: 10
- requests-per-hour: 100
- concurrent-sessions: 1

## Data Handling
- personal-data-collection: none
- data-retention: none
- third-party-sharing: none
- gdpr-compliance: true

## Restrictions
- disallowed-paths: /patient/*, /records/*, /admin/*
- require-human-approval: /appointments/*, /prescriptions/*

## Agent Identification
- require-agent-header: true
- require-disclosure: true
```

## Step 2: Create the File

Create a file named `AGENTS.md` in the root of your web server, such that it is accessible at `https://yourdomain.com/AGENTS.md`.

Alternatively, place it at `https://yourdomain.com/.well-known/agents.md`.

## Step 3: Verify Accessibility

Test that the file is accessible:

```bash
curl -I https://yourdomain.com/AGENTS.md
# Should return HTTP 200

curl https://yourdomain.com/AGENTS.md
# Should return your file contents
```

## Step 4: Validate Your File

Use the `agents-md` parser to validate your file:

```bash
# With Node.js
npx agents-md validate ./AGENTS.md

# With Python
python -m agents_md validate ./AGENTS.md
```

## Step 5: Keep It Updated

Update `last-updated` in the Identity section whenever you change your policy. Agents may cache your file for up to 24 hours, so changes may not take effect immediately.

## Common Mistakes

**Using a URL instead of a domain in `site`:**
```markdown
# Wrong
- site: https://example.com

# Correct
- site: example.com
```

**Paths without leading slash:**
```markdown
# Wrong
- disallowed-paths: admin/*, internal/*

# Correct
- disallowed-paths: /admin/*, /internal/*
```

**Forgetting to update `last-updated` after changes:**
Always bump the date when you modify your policy so agents know to re-fetch.
