# AGENTS.md

# Example: Government services portal.
# Policy: Public information is freely accessible. Service transactions
# (applications, benefits, renewals) require high trust and explicit human
# approval. Very conservative rate limits to ensure service availability.

## Identity
- site: services.example-gov.gov
- contact: digital-services@example-gov.gov
- last-updated: 2026-02-26
- spec-version: 1.0.0

## Trust Requirements
- minimum-trust-level: 4
- authentication: required
- authentication-methods: oauth2

## Allowed Actions
- read-content: true
- submit-forms: false
- make-purchases: false
- modify-account: false
- access-api: false
- download-files: true
- upload-files: false
- send-messages: false
- delete-data: false
- create-content: false

## Rate Limits
- requests-per-minute: 10
- requests-per-hour: 100
- concurrent-sessions: 1

## Data Handling
- personal-data-collection: minimal
- data-retention: session-only
- third-party-sharing: none
- gdpr-compliance: true

## Restrictions
- disallowed-paths: /admin/*, /internal/*, /staff/*, /case-management/*, /database/*
- require-human-approval: /applications/submit, /benefits/apply, /renewals/*, /appointments/book, /documents/upload
- read-only-paths: /news/*, /publications/*, /forms/*, /help/*, /about/*, /contact/*

## Agent Identification
- require-agent-header: true
- agent-header-name: X-Agent-Identity
- require-disclosure: true
