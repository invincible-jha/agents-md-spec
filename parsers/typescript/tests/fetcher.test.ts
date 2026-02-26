// SPDX-License-Identifier: MIT
// Copyright (c) 2026 MuVeraAI Corporation

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FetchPolicyError, fetchPolicy } from '../src/fetcher.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MINIMAL_AGENTS_MD = `# AGENTS.md

## Identity
- site: example.com
- contact: ai@example.com
`;

const FULL_AGENTS_MD = `# AGENTS.md

## Identity
- site: example.com

## Trust Requirements
- minimum-trust-level: 2
- authentication: required

## Allowed Actions
- read-content: true
- submit-forms: false
`;

// ---------------------------------------------------------------------------
// Fetch mock helpers
// ---------------------------------------------------------------------------

function mockFetch(responses: Record<string, { status: number; body: string; url?: string }>): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString();
      const response = responses[url];

      if (!response) {
        return Promise.resolve({
          ok: false,
          status: 404,
          url,
          headers: new Headers(),
          text: () => Promise.resolve(''),
        } as Response);
      }

      return Promise.resolve({
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        url: response.url ?? url,
        headers: new Headers(),
        text: () => Promise.resolve(response.body),
      } as Response);
    }),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('fetchPolicy — URL resolution and fallback', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches from /AGENTS.md first and returns parsed result on success', async () => {
    mockFetch({
      'https://example.com/AGENTS.md': { status: 200, body: MINIMAL_AGENTS_MD },
    });

    const result = await fetchPolicy('https://example.com', { enforceHttps: false });
    expect(result).not.toBeNull();
    expect(result?.success).toBe(true);
    expect(result?.policy?.identity.site).toBe('example.com');
  });

  it('falls back to /.well-known/agents.md when /AGENTS.md returns 404', async () => {
    mockFetch({
      'https://example.com/AGENTS.md': { status: 404, body: 'Not Found' },
      'https://example.com/.well-known/agents.md': { status: 200, body: MINIMAL_AGENTS_MD },
    });

    const result = await fetchPolicy('https://example.com', { enforceHttps: false });
    expect(result).not.toBeNull();
    expect(result?.success).toBe(true);
  });

  it('returns null when both /AGENTS.md and /.well-known/agents.md return 404', async () => {
    mockFetch({});

    const result = await fetchPolicy('https://example.com', { enforceHttps: false });
    expect(result).toBeNull();
  });

  it('strips trailing slashes from the base URL before building candidate URLs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: 'https://example.com/AGENTS.md',
      headers: new Headers(),
      text: () => Promise.resolve(MINIMAL_AGENTS_MD),
    } as Response);
    vi.stubGlobal('fetch', fetchMock);

    await fetchPolicy('https://example.com/', { enforceHttps: false });

    const calledUrl = (fetchMock.mock.calls[0] as unknown[])[0] as string;
    expect(calledUrl).toBe('https://example.com/AGENTS.md');
    expect(calledUrl).not.toContain('//AGENTS.md');
  });

  it('throws FetchPolicyError when base URL uses HTTP and enforceHttps is true', async () => {
    await expect(
      fetchPolicy('http://example.com'),
    ).rejects.toThrow(FetchPolicyError);
  });

  it('does not throw when base URL uses HTTP and enforceHttps is false', async () => {
    mockFetch({
      'http://example.com/AGENTS.md': { status: 200, body: MINIMAL_AGENTS_MD },
    });

    await expect(
      fetchPolicy('http://example.com', { enforceHttps: false }),
    ).resolves.not.toBeNull();
  });

  it('parses a full-featured AGENTS.md file fetched from the network', async () => {
    mockFetch({
      'https://example.com/AGENTS.md': { status: 200, body: FULL_AGENTS_MD },
    });

    const result = await fetchPolicy('https://example.com', { enforceHttps: false });
    expect(result?.success).toBe(true);
    expect(result?.policy?.trustRequirements.minimumTrustLevel).toBe(2);
    expect(result?.policy?.allowedActions.readContent).toBe(true);
  });

  it('returns a failed ParseResult when the file is found but unparseable', async () => {
    mockFetch({
      'https://example.com/AGENTS.md': {
        status: 200,
        body: '## Trust Requirements\n- minimum-trust-level: 1\n',
      },
    });

    const result = await fetchPolicy('https://example.com', { enforceHttps: false });
    // File is found but has no Identity section — parse should fail.
    expect(result).not.toBeNull();
    expect(result?.success).toBe(false);
    expect(result?.errors.length).toBeGreaterThan(0);
  });
});
