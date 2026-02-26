// SPDX-License-Identifier: MIT
// Copyright (c) 2026 MuVeraAI Corporation

import { describe, expect, it } from 'vitest';
import { AgentsMdParser } from '../src/parser.js';
import type { ParseResult } from '../src/types.js';

const parser = new AgentsMdParser();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMinimalFile(extra = ''): string {
  return `# AGENTS.md\n\n## Identity\n- site: example.com\n${extra}`;
}

// ---------------------------------------------------------------------------
// Basic parsing
// ---------------------------------------------------------------------------

describe('AgentsMdParser — basic parsing', () => {
  it('parses a minimal valid file with only an Identity section', () => {
    const result = parser.parse(makeMinimalFile());
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.policy?.identity.site).toBe('example.com');
  });

  it('returns success:false for an empty string', () => {
    const result = parser.parse('');
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns success:false for a file with only whitespace', () => {
    const result = parser.parse('   \n\n  \t  ');
    expect(result.success).toBe(false);
  });

  it('returns success:false when the Identity section is missing', () => {
    const content = `# AGENTS.md\n\n## Trust Requirements\n- minimum-trust-level: 2\n`;
    const result = parser.parse(content);
    expect(result.success).toBe(false);
    expect(result.errors[0]?.section).toBe('identity');
  });

  it('returns success:false when the site key is missing from Identity', () => {
    const content = `# AGENTS.md\n\n## Identity\n- contact: admin@example.com\n`;
    const result = parser.parse(content);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Identity section
// ---------------------------------------------------------------------------

describe('AgentsMdParser — Identity section', () => {
  it('parses all Identity fields correctly', () => {
    const content = `# AGENTS.md

## Identity
- site: example.com
- contact: ai@example.com
- last-updated: 2026-03-15
- spec-version: 1.0.0
`;
    const result = parser.parse(content);
    expect(result.success).toBe(true);
    expect(result.policy?.identity).toEqual({
      site: 'example.com',
      contact: 'ai@example.com',
      lastUpdated: '2026-03-15',
      specVersion: '1.0.0',
    });
  });

  it('trims whitespace from site values', () => {
    const content = `# AGENTS.md\n\n## Identity\n-   site:   example.com   \n`;
    const result = parser.parse(content);
    expect(result.policy?.identity.site).toBe('example.com');
  });

  it('ignores comment lines within a section', () => {
    const content = `# AGENTS.md\n\n## Identity\n# this is a comment\n- site: example.com\n`;
    const result = parser.parse(content);
    expect(result.success).toBe(true);
    expect(result.policy?.identity.site).toBe('example.com');
  });

  it('warns about unknown keys in the Identity section', () => {
    const content = `# AGENTS.md\n\n## Identity\n- site: example.com\n- unknown-key: value\n`;
    const result = parser.parse(content);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.message.includes('unknown-key'))).toBe(true);
  });

  it('does not warn about x- prefixed extension keys', () => {
    const content = `# AGENTS.md\n\n## Identity\n- site: example.com\n- x-custom-key: custom-value\n`;
    const result = parser.parse(content);
    expect(result.warnings.filter((w) => w.message.includes('x-custom-key'))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Trust Requirements section
// ---------------------------------------------------------------------------

describe('AgentsMdParser — Trust Requirements section', () => {
  it('applies default trust requirements when the section is absent', () => {
    const result = parser.parse(makeMinimalFile());
    expect(result.policy?.trustRequirements.minimumTrustLevel).toBe(0);
    expect(result.policy?.trustRequirements.authentication).toBe('none');
  });

  it('parses all Trust Requirements fields', () => {
    const content = makeMinimalFile(`
## Trust Requirements
- minimum-trust-level: 3
- authentication: required
- authentication-methods: oauth2, api-key, bearer
`);
    const result = parser.parse(content);
    expect(result.policy?.trustRequirements.minimumTrustLevel).toBe(3);
    expect(result.policy?.trustRequirements.authentication).toBe('required');
    expect(result.policy?.trustRequirements.authenticationMethods).toEqual([
      'oauth2',
      'api-key',
      'bearer',
    ]);
  });

  it('warns and clamps trust levels outside 0-5 range', () => {
    const content = makeMinimalFile(`\n## Trust Requirements\n- minimum-trust-level: 7\n`);
    const result = parser.parse(content);
    expect(result.warnings.some((w) => w.message.includes('Trust level'))).toBe(true);
    expect(result.policy?.trustRequirements.minimumTrustLevel).toBeLessThanOrEqual(5);
  });

  it('warns about invalid authentication values', () => {
    const content = makeMinimalFile(`\n## Trust Requirements\n- authentication: maybe\n`);
    const result = parser.parse(content);
    expect(result.warnings.some((w) => w.message.includes('authentication'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Allowed Actions section
// ---------------------------------------------------------------------------

describe('AgentsMdParser — Allowed Actions section', () => {
  it('applies defaults when Allowed Actions section is absent', () => {
    const result = parser.parse(makeMinimalFile());
    expect(result.policy?.allowedActions.readContent).toBe(true);
    expect(result.policy?.allowedActions.submitForms).toBe(false);
    expect(result.policy?.allowedActions.makePurchases).toBe(false);
  });

  it('parses boolean action values correctly', () => {
    const content = makeMinimalFile(`
## Allowed Actions
- read-content: true
- submit-forms: false
- make-purchases: yes
- modify-account: no
- access-api: 1
- download-files: 0
`);
    const result = parser.parse(content);
    expect(result.policy?.allowedActions.readContent).toBe(true);
    expect(result.policy?.allowedActions.submitForms).toBe(false);
    expect(result.policy?.allowedActions.makePurchases).toBe(true);
    expect(result.policy?.allowedActions.modifyAccount).toBe(false);
    expect(result.policy?.allowedActions.accessApi).toBe(true);
    expect(result.policy?.allowedActions.downloadFiles).toBe(false);
  });

  it('converts kebab-case action keys to camelCase', () => {
    const content = makeMinimalFile(`\n## Allowed Actions\n- send-messages: true\n`);
    const result = parser.parse(content);
    expect(result.policy?.allowedActions.sendMessages).toBe(true);
  });

  it('warns on unrecognized boolean values in actions', () => {
    const content = makeMinimalFile(`\n## Allowed Actions\n- read-content: maybe\n`);
    const result = parser.parse(content);
    expect(result.warnings.some((w) => w.message.includes('"maybe"'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Rate Limits section
// ---------------------------------------------------------------------------

describe('AgentsMdParser — Rate Limits section', () => {
  it('returns empty rate limits when section is absent', () => {
    const result = parser.parse(makeMinimalFile());
    expect(result.policy?.rateLimits).toEqual({});
  });

  it('parses all rate limit fields as integers', () => {
    const content = makeMinimalFile(`
## Rate Limits
- requests-per-minute: 30
- requests-per-hour: 500
- concurrent-sessions: 3
`);
    const result = parser.parse(content);
    expect(result.policy?.rateLimits.requestsPerMinute).toBe(30);
    expect(result.policy?.rateLimits.requestsPerHour).toBe(500);
    expect(result.policy?.rateLimits.concurrentSessions).toBe(3);
  });

  it('warns and omits non-integer rate limit values', () => {
    const content = makeMinimalFile(`\n## Rate Limits\n- requests-per-minute: fast\n`);
    const result = parser.parse(content);
    expect(result.warnings.some((w) => w.message.includes('"fast"'))).toBe(true);
    expect(result.policy?.rateLimits.requestsPerMinute).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Data Handling section
// ---------------------------------------------------------------------------

describe('AgentsMdParser — Data Handling section', () => {
  it('returns empty data handling when section is absent', () => {
    const result = parser.parse(makeMinimalFile());
    expect(result.policy?.dataHandling).toEqual({});
  });

  it('parses all data handling enum values', () => {
    const content = makeMinimalFile(`
## Data Handling
- personal-data-collection: minimal
- data-retention: session-only
- third-party-sharing: none
- gdpr-compliance: true
`);
    const result = parser.parse(content);
    expect(result.policy?.dataHandling.personalDataCollection).toBe('minimal');
    expect(result.policy?.dataHandling.dataRetention).toBe('session-only');
    expect(result.policy?.dataHandling.thirdPartySharing).toBe('none');
    expect(result.policy?.dataHandling.gdprCompliance).toBe(true);
  });

  it('warns on invalid enum values and omits the field', () => {
    const content = makeMinimalFile(`\n## Data Handling\n- personal-data-collection: extreme\n`);
    const result = parser.parse(content);
    expect(result.warnings.some((w) => w.message.includes('"extreme"'))).toBe(true);
    expect(result.policy?.dataHandling.personalDataCollection).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Restrictions section
// ---------------------------------------------------------------------------

describe('AgentsMdParser — Restrictions section', () => {
  it('returns empty arrays when Restrictions section is absent', () => {
    const result = parser.parse(makeMinimalFile());
    expect(result.policy?.restrictions.disallowedPaths).toEqual([]);
    expect(result.policy?.restrictions.requireHumanApproval).toEqual([]);
    expect(result.policy?.restrictions.readOnlyPaths).toEqual([]);
  });

  it('parses comma-separated path arrays', () => {
    const content = makeMinimalFile(`
## Restrictions
- disallowed-paths: /admin/*, /internal/*
- require-human-approval: /checkout/*, /account/delete
- read-only-paths: /blog/*, /docs/**
`);
    const result = parser.parse(content);
    expect(result.policy?.restrictions.disallowedPaths).toEqual(['/admin/*', '/internal/*']);
    expect(result.policy?.restrictions.requireHumanApproval).toEqual([
      '/checkout/*',
      '/account/delete',
    ]);
    expect(result.policy?.restrictions.readOnlyPaths).toEqual(['/blog/*', '/docs/**']);
  });

  it('warns about paths that do not start with /', () => {
    const content = makeMinimalFile(`\n## Restrictions\n- disallowed-paths: admin/*, internal\n`);
    const result = parser.parse(content);
    expect(result.warnings.some((w) => w.section === 'restrictions')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Agent Identification section
// ---------------------------------------------------------------------------

describe('AgentsMdParser — Agent Identification section', () => {
  it('applies permissive defaults when section is absent', () => {
    const result = parser.parse(makeMinimalFile());
    expect(result.policy?.agentIdentification.requireAgentHeader).toBe(false);
    expect(result.policy?.agentIdentification.requireDisclosure).toBe(false);
    expect(result.policy?.agentIdentification.agentHeaderName).toBeUndefined();
  });

  it('parses all agent identification fields', () => {
    const content = makeMinimalFile(`
## Agent Identification
- require-agent-header: true
- agent-header-name: X-AI-Bot
- require-disclosure: true
`);
    const result = parser.parse(content);
    expect(result.policy?.agentIdentification.requireAgentHeader).toBe(true);
    expect(result.policy?.agentIdentification.agentHeaderName).toBe('X-AI-Bot');
    expect(result.policy?.agentIdentification.requireDisclosure).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Edge cases and robustness
// ---------------------------------------------------------------------------

describe('AgentsMdParser — edge cases', () => {
  it('handles Windows-style CRLF line endings', () => {
    const content = '# AGENTS.md\r\n\r\n## Identity\r\n- site: example.com\r\n';
    const result = parser.parse(content);
    expect(result.success).toBe(true);
    expect(result.policy?.identity.site).toBe('example.com');
  });

  it('ignores section-level prose lines that are not directives', () => {
    const content = `# AGENTS.md

## Identity
This is a prose description that parsers must ignore.
- site: example.com
Another prose line here.
`;
    const result = parser.parse(content);
    expect(result.success).toBe(true);
    expect(result.policy?.identity.site).toBe('example.com');
  });

  it('handles multiple blank lines within and between sections', () => {
    const content = `# AGENTS.md



## Identity

- site: example.com


## Rate Limits

- requests-per-minute: 10

`;
    const result = parser.parse(content);
    expect(result.success).toBe(true);
    expect(result.policy?.rateLimits.requestsPerMinute).toBe(10);
  });

  it('parses case-insensitive boolean values', () => {
    const content = makeMinimalFile(`
## Allowed Actions
- read-content: TRUE
- submit-forms: FALSE
- make-purchases: Yes
- modify-account: NO
`);
    const result = parser.parse(content);
    expect(result.policy?.allowedActions.readContent).toBe(true);
    expect(result.policy?.allowedActions.submitForms).toBe(false);
    expect(result.policy?.allowedActions.makePurchases).toBe(true);
    expect(result.policy?.allowedActions.modifyAccount).toBe(false);
  });

  it('parses a complete full-featured file without errors', () => {
    const content = `# AGENTS.md

## Identity
- site: enterprise.example.com
- contact: ai-policy@example.com
- last-updated: 2026-03-15
- spec-version: 1.0.0

## Trust Requirements
- minimum-trust-level: 2
- authentication: required
- authentication-methods: oauth2, api-key

## Allowed Actions
- read-content: true
- submit-forms: true
- make-purchases: false
- modify-account: false
- access-api: true

## Rate Limits
- requests-per-minute: 60
- requests-per-hour: 1000
- concurrent-sessions: 5

## Data Handling
- personal-data-collection: standard
- data-retention: 1-year
- third-party-sharing: with-consent
- gdpr-compliance: true

## Restrictions
- disallowed-paths: /admin/*, /internal/*
- require-human-approval: /checkout/confirm
- read-only-paths: /blog/*, /docs/**

## Agent Identification
- require-agent-header: true
- agent-header-name: X-Agent-Identity
- require-disclosure: true
`;
    const result = parser.parse(content);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.policy?.identity.site).toBe('enterprise.example.com');
    expect(result.policy?.trustRequirements.minimumTrustLevel).toBe(2);
    expect(result.policy?.allowedActions.accessApi).toBe(true);
    expect(result.policy?.rateLimits.requestsPerHour).toBe(1000);
    expect(result.policy?.dataHandling.gdprCompliance).toBe(true);
    expect(result.policy?.restrictions.disallowedPaths).toContain('/admin/*');
    expect(result.policy?.agentIdentification.requireDisclosure).toBe(true);
  });

  it('handles a file with sections in unusual order', () => {
    const content = `# AGENTS.md

## Rate Limits
- requests-per-minute: 10

## Identity
- site: example.com

## Agent Identification
- require-disclosure: true
`;
    const result = parser.parse(content);
    expect(result.success).toBe(true);
    expect(result.policy?.rateLimits.requestsPerMinute).toBe(10);
    expect(result.policy?.agentIdentification.requireDisclosure).toBe(true);
  });

  it('parses authentication-methods with extra whitespace around items', () => {
    const content = makeMinimalFile(`
## Trust Requirements
- minimum-trust-level: 1
- authentication: optional
- authentication-methods:  oauth2 ,  api-key ,  bearer
`);
    const result = parser.parse(content);
    expect(result.policy?.trustRequirements.authenticationMethods).toEqual([
      'oauth2',
      'api-key',
      'bearer',
    ]);
  });

  it('handles a directive line where the value contains a colon', () => {
    const content = `# AGENTS.md\n\n## Identity\n- site: example.com\n- contact: admin@example.com:8080\n`;
    const result = parser.parse(content);
    // The value after the first colon should be taken — this tests that we only split on the first colon.
    expect(result.policy?.identity.contact).toBe('admin@example.com:8080');
  });
});
