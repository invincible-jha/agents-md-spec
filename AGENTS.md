# AGENTS.md

<!-- SPDX-License-Identifier: CC-BY-SA-4.0 -->
<!-- Copyright (c) 2026 MuVeraAI Corporation -->

# This file declares AI agent interaction policies for the agents-md-spec repository.
# We eat our own dogfood: the home of the AGENTS.md specification uses AGENTS.md itself.
# Specification: AGENTS-MD-SPEC-001 — https://github.com/aumos-ai/agents-md-spec

## Identity
- site: github.com/aumos-ai/agents-md-spec
- contact: ai-policy@muveraai.com
- last-updated: 2026-02-28
- spec-version: 1.0.0

## Trust Requirements
# Trust level 1 = Identified. Trust changes are MANUAL ONLY — no automatic progression.
# Levels: 0 (Anonymous) 1 (Identified) 2 (Verified) 3 (Authorized) 4 (Privileged) 5 (Administrative)
- minimum-trust-level: 1
- authentication: optional

## Allowed Actions
# This is a public open-source repository. Agents may read content freely.
# Write actions (pull requests, issues) require authentication via GitHub.
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
# Respect GitHub's own rate limits. These are additional soft limits for agent traffic.
- requests-per-minute: 30
- requests-per-hour: 500
- concurrent-sessions: 3

## Data Handling
# This repository does not collect personal data from agent interactions.
# All interactions are ephemeral read-only operations against public GitHub content.
- personal-data-collection: none
- data-retention: none
- third-party-sharing: none
- gdpr-compliance: true

## Restrictions
# Agents must not attempt to access private forks, internal tooling, or CI secrets.
- disallowed-paths: /.github/workflows/*, /.github/secrets/*
- require-human-approval: /pulls/*, /issues/*
- read-only-paths: /spec/*, /parsers/*, /docs/*

## Agent Identification
# Agents are encouraged (but not required) to identify themselves.
# Disclosure of AI nature is not required for read-only repository access.
- require-agent-header: false
- require-disclosure: false
