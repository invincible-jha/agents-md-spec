# AGENTS.md

# Example: E-commerce retail site.
# Policy: Agents may browse and add to cart. Purchases and account modifications
# require human approval. High-value actions require verified trust level.

## Identity
- site: shop.example-retail.com
- contact: ai-policy@example-retail.com
- last-updated: 2026-02-26
- spec-version: 1.0.0

## Trust Requirements
- minimum-trust-level: 2
- authentication: required
- authentication-methods: oauth2, api-key

## Allowed Actions
- read-content: true
- submit-forms: true
- make-purchases: true
- modify-account: false
- access-api: true
- download-files: false
- upload-files: false
- send-messages: false
- delete-data: false
- create-content: false

## Rate Limits
- requests-per-minute: 30
- requests-per-hour: 500
- concurrent-sessions: 3

## Data Handling
- personal-data-collection: standard
- data-retention: 1-year
- third-party-sharing: with-consent
- gdpr-compliance: true

## Restrictions
- disallowed-paths: /admin/*, /staff/*, /warehouse/*, /internal/*
- require-human-approval: /checkout/confirm, /account/delete, /payment/*
- read-only-paths: /products/*, /categories/*, /search/*, /reviews/*

## Agent Identification
- require-agent-header: true
- agent-header-name: X-Agent-Identity
- require-disclosure: true
