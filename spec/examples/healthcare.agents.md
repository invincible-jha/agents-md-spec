# AGENTS.md

# Example: Healthcare patient portal.
# Policy: Strict data handling (HIPAA context). Agents must be explicitly
# authorized (trust level 3) and may only read non-PHI content without
# additional permissions. Any access to patient data requires human approval.
# All agent interactions must be disclosed.

## Identity
- site: portal.example-health.com
- contact: privacy@example-health.com
- last-updated: 2026-02-26
- spec-version: 1.0.0

## Trust Requirements
- minimum-trust-level: 3
- authentication: required
- authentication-methods: oauth2

## Allowed Actions
- read-content: true
- submit-forms: false
- make-purchases: false
- modify-account: false
- access-api: false
- download-files: false
- upload-files: false
- send-messages: false
- delete-data: false
- create-content: false

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
- disallowed-paths: /patient/*/records, /patient/*/prescriptions, /admin/*, /staff/*, /billing/*
- require-human-approval: /appointments/book, /prescriptions/refill, /patient/*/update, /messages/send
- read-only-paths: /health-library/*, /providers/*, /locations/*, /about/*

## Agent Identification
- require-agent-header: true
- agent-header-name: X-Agent-Identity
- require-disclosure: true
