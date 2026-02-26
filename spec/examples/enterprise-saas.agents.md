# AGENTS.md

# Example: Enterprise SaaS platform.
# Policy: Full API access for verified agents. Agents acting as service
# accounts can read, create, and modify content within their authorized
# workspace. Destructive operations (delete, bulk modify) require human
# approval. High rate limits for programmatic integration use cases.

## Identity
- site: app.example-saas.io
- contact: platform-policy@example-saas.io
- last-updated: 2026-02-26
- spec-version: 1.0.0

## Trust Requirements
- minimum-trust-level: 2
- authentication: required
- authentication-methods: oauth2, api-key, bearer

## Allowed Actions
- read-content: true
- submit-forms: true
- make-purchases: false
- modify-account: false
- access-api: true
- download-files: true
- upload-files: true
- send-messages: true
- delete-data: false
- create-content: true

## Rate Limits
- requests-per-minute: 120
- requests-per-hour: 5000
- concurrent-sessions: 10

## Data Handling
- personal-data-collection: standard
- data-retention: 1-year
- third-party-sharing: with-consent
- gdpr-compliance: true

## Restrictions
- disallowed-paths: /billing/*, /admin/*, /org/*/danger-zone, /api/internal/*
- require-human-approval: /workspaces/*/delete, /org/*/delete, /users/*/remove, /api/bulk-delete
- read-only-paths: /audit-log/*, /changelog/*, /status/*

## Agent Identification
- require-agent-header: true
- agent-header-name: X-Agent-Identity
- require-disclosure: false
