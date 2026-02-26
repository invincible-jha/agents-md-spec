# AGENTS.md

# Example: Personal or editorial blog.
# Policy: Agents may freely read and summarize content.
# No authentication required. No accounts, no purchases.
# Rate limiting is light to prevent bulk scraping.

## Identity
- site: example-blog.com
- contact: hello@example-blog.com
- last-updated: 2026-02-26
- spec-version: 1.0.0

## Trust Requirements
- minimum-trust-level: 0
- authentication: none

## Allowed Actions
- read-content: true
- submit-forms: false
- make-purchases: false
- modify-account: false
- access-api: false
- download-files: false
- create-content: false

## Rate Limits
- requests-per-minute: 20
- requests-per-hour: 200
- concurrent-sessions: 2

## Data Handling
- personal-data-collection: minimal
- data-retention: 30-days
- third-party-sharing: anonymized
- gdpr-compliance: true

## Restrictions
- disallowed-paths: /wp-admin/*, /author/*/edit, /.git/*
- read-only-paths: /posts/*, /pages/*, /tags/*, /categories/*

## Agent Identification
- require-agent-header: false
- require-disclosure: false
