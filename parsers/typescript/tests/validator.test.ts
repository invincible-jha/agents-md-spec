// SPDX-License-Identifier: MIT
// Copyright (c) 2026 MuVeraAI Corporation

import { describe, expect, it } from 'vitest';
import { validate } from '../src/validator.js';
import type { AgentsPolicy } from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidPolicy(overrides: Partial<AgentsPolicy> = {}): AgentsPolicy {
  return {
    identity: {
      site: 'example.com',
      contact: 'ai@example.com',
      lastUpdated: '2026-03-15',
    },
    trustRequirements: {
      minimumTrustLevel: 2,
      authentication: 'required',
      authenticationMethods: ['oauth2', 'api-key'],
    },
    allowedActions: {
      readContent: true,
      submitForms: false,
      makePurchases: false,
    },
    rateLimits: {
      requestsPerMinute: 30,
      requestsPerHour: 500,
      concurrentSessions: 3,
    },
    dataHandling: {
      personalDataCollection: 'minimal',
      dataRetention: 'session-only',
      thirdPartySharing: 'none',
      gdprCompliance: true,
    },
    restrictions: {
      disallowedPaths: ['/admin/*'],
      requireHumanApproval: ['/checkout/*'],
      readOnlyPaths: ['/blog/*'],
    },
    agentIdentification: {
      requireAgentHeader: true,
      agentHeaderName: 'X-Agent-Identity',
      requireDisclosure: true,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Valid policy
// ---------------------------------------------------------------------------

describe('validate — valid policy', () => {
  it('returns valid:true for a fully populated valid policy', () => {
    const result = validate(makeValidPolicy());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid:true for a minimal policy with only identity', () => {
    const result = validate(makeValidPolicy({
      trustRequirements: { minimumTrustLevel: 0, authentication: 'none' },
      allowedActions: { readContent: true },
      rateLimits: {},
      dataHandling: {},
      restrictions: { disallowedPaths: [], requireHumanApproval: [], readOnlyPaths: [] },
      agentIdentification: { requireAgentHeader: false, requireDisclosure: false },
    }));
    expect(result.valid).toBe(true);
  });

  it('returns valid:true when trust level is exactly 0', () => {
    expect(validate(makeValidPolicy({
      trustRequirements: { minimumTrustLevel: 0, authentication: 'none' },
    })).valid).toBe(true);
  });

  it('returns valid:true when trust level is exactly 5', () => {
    expect(validate(makeValidPolicy({
      trustRequirements: { minimumTrustLevel: 5, authentication: 'required' },
    })).valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Identity validation
// ---------------------------------------------------------------------------

describe('validate — Identity section', () => {
  it('returns errors when site is an empty string', () => {
    const result = validate(makeValidPolicy({ identity: { site: '' } }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('site'))).toBe(true);
  });

  it('returns errors when site contains a protocol', () => {
    const result = validate(makeValidPolicy({ identity: { site: 'https://example.com' } }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('protocol'))).toBe(true);
  });

  it('returns errors for an invalid lastUpdated date format', () => {
    const result = validate(makeValidPolicy({
      identity: { site: 'example.com', lastUpdated: 'March 15, 2026' },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('lastUpdated'))).toBe(true);
  });

  it('returns valid:true for a valid ISO 8601 datetime with timezone', () => {
    const result = validate(makeValidPolicy({
      identity: { site: 'example.com', lastUpdated: '2026-03-15T10:30:00Z' },
    }));
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Trust Requirements validation
// ---------------------------------------------------------------------------

describe('validate — Trust Requirements', () => {
  it('returns errors when minimumTrustLevel is negative', () => {
    const result = validate(makeValidPolicy({
      trustRequirements: { minimumTrustLevel: -1, authentication: 'none' },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('minimumTrustLevel'))).toBe(true);
  });

  it('returns errors when minimumTrustLevel is greater than 5', () => {
    const result = validate(makeValidPolicy({
      trustRequirements: { minimumTrustLevel: 6, authentication: 'none' },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('minimumTrustLevel'))).toBe(true);
  });

  it('returns errors when minimumTrustLevel is a float', () => {
    const result = validate(makeValidPolicy({
      trustRequirements: { minimumTrustLevel: 2.5, authentication: 'none' },
    }));
    expect(result.valid).toBe(false);
  });

  it('returns errors when authentication value is invalid', () => {
    const result = validate(makeValidPolicy({
      trustRequirements: {
        minimumTrustLevel: 1,
        authentication: 'maybe' as 'required' | 'optional' | 'none',
      },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('authentication'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Rate Limits validation
// ---------------------------------------------------------------------------

describe('validate — Rate Limits', () => {
  it('returns errors when requestsPerMinute is negative', () => {
    const result = validate(makeValidPolicy({
      rateLimits: { requestsPerMinute: -1 },
    }));
    expect(result.valid).toBe(false);
  });

  it('accepts 0 as a valid rate limit (meaning unlimited)', () => {
    const result = validate(makeValidPolicy({
      rateLimits: { requestsPerMinute: 0, requestsPerHour: 0 },
    }));
    expect(result.valid).toBe(true);
  });

  it('returns errors when concurrentSessions is not an integer', () => {
    const result = validate(makeValidPolicy({
      rateLimits: { concurrentSessions: 1.5 },
    }));
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Restrictions validation
// ---------------------------------------------------------------------------

describe('validate — Restrictions', () => {
  it('returns errors when a disallowedPath does not start with /', () => {
    const result = validate(makeValidPolicy({
      restrictions: {
        disallowedPaths: ['admin/*'],
        requireHumanApproval: [],
        readOnlyPaths: [],
      },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('disallowedPaths'))).toBe(true);
  });

  it('accepts valid glob path patterns', () => {
    const result = validate(makeValidPolicy({
      restrictions: {
        disallowedPaths: ['/admin/*', '/internal/**'],
        requireHumanApproval: ['/checkout/confirm'],
        readOnlyPaths: ['/docs/**', '/blog/*'],
      },
    }));
    expect(result.valid).toBe(true);
  });

  it('returns errors when a requireHumanApproval path does not start with /', () => {
    const result = validate(makeValidPolicy({
      restrictions: {
        disallowedPaths: [],
        requireHumanApproval: ['checkout/confirm'],
        readOnlyPaths: [],
      },
    }));
    expect(result.valid).toBe(false);
  });
});
