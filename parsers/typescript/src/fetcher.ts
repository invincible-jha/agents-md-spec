// SPDX-License-Identifier: MIT
// Copyright (c) 2026 MuVeraAI Corporation

import { AgentsMdParser } from './parser.js';
import type { ParseResult } from './types.js';

/** Maximum file size accepted (1 MB) as per the specification. */
const MAX_FILE_SIZE_BYTES = 1_048_576;

/** Fetch timeout in milliseconds as per the specification. */
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Fetches and parses an AGENTS.md policy from a web property.
 *
 * Tries the following URLs in order:
 * 1. `{baseUrl}/AGENTS.md`
 * 2. `{baseUrl}/.well-known/agents.md`
 *
 * Returns null if no policy file is found at either location.
 * Returns a ParseResult (potentially with errors) if a file is found but fails to parse.
 *
 * AGENTS.md files MUST be served over HTTPS. This function enforces that rule
 * in production (when `enforceHttps` is true).
 *
 * @param baseUrl - The base URL of the web property (e.g., "https://example.com").
 *                  Must include the scheme. Trailing slashes are handled automatically.
 * @param options - Optional fetch configuration.
 * @returns A ParseResult if an AGENTS.md file was found, or null if not found.
 *
 * @example
 * ```typescript
 * const result = await fetchPolicy('https://example.com');
 * if (result && result.success && result.policy) {
 *   console.log(result.policy.identity.site);
 * }
 * ```
 */
export async function fetchPolicy(
  baseUrl: string,
  options: FetchPolicyOptions = {},
): Promise<ParseResult | null> {
  const { enforceHttps = true, timeoutMs = FETCH_TIMEOUT_MS } = options;

  const normalizedBase = baseUrl.replace(/\/+$/, '');

  if (enforceHttps && !normalizedBase.startsWith('https://')) {
    throw new FetchPolicyError(
      `AGENTS.md must be served over HTTPS. Received URL: "${baseUrl}". ` +
        'Pass { enforceHttps: false } to override for testing.',
    );
  }

  const candidateUrls = [
    `${normalizedBase}/AGENTS.md`,
    `${normalizedBase}/.well-known/agents.md`,
  ];

  for (const url of candidateUrls) {
    const content = await attemptFetch(url, timeoutMs, enforceHttps);
    if (content === null) continue;

    const parser = new AgentsMdParser();
    return parser.parse(content);
  }

  return null;
}

/**
 * Options for the fetchPolicy function.
 */
export interface FetchPolicyOptions {
  /**
   * Whether to enforce HTTPS for fetching the policy file.
   * Set to false only for testing with local HTTP servers.
   * @default true
   */
  enforceHttps?: boolean;
  /**
   * Timeout in milliseconds for each fetch attempt.
   * @default 10000
   */
  timeoutMs?: number;
}

/**
 * Error thrown by fetchPolicy for non-recoverable errors (e.g., HTTP scheme violation).
 */
export class FetchPolicyError extends Error {
  public override readonly name = 'FetchPolicyError';
  public constructor(message: string) {
    super(message);
  }
}

/**
 * Attempts to fetch the content at the given URL.
 *
 * Returns the string content on success (HTTP 200).
 * Returns null on HTTP 404 or if the response is not a 2xx status.
 * Throws on network errors or timeouts.
 *
 * @param url - The fully qualified URL to fetch.
 * @param timeoutMs - The timeout in milliseconds.
 * @param enforceHttps - Whether to reject HTTP-to-HTTP redirects.
 * @returns The file content as a string, or null if not found.
 */
async function attemptFetch(
  url: string,
  timeoutMs: number,
  enforceHttps: boolean,
): Promise<string | null> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/markdown, text/plain, */*',
        'User-Agent': 'agents-md-parser/1.0.0 (https://github.com/aumos-oss/agents-md-spec)',
      },
    });

    // Detect HTTPS downgrade in redirect response URL.
    if (enforceHttps && !response.url.startsWith('https://')) {
      return null;
    }

    if (response.status === 404) return null;
    if (!response.ok) return null;

    // Enforce file size limit.
    const contentLength = response.headers.get('content-length');
    if (contentLength !== null && parseInt(contentLength, 10) > MAX_FILE_SIZE_BYTES) {
      return null;
    }

    const text = await response.text();

    // Secondary size check for when content-length was not provided.
    if (new TextEncoder().encode(text).length > MAX_FILE_SIZE_BYTES) {
      return null;
    }

    return text;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Timeout — treat as not found rather than throwing.
      return null;
    }
    // Re-throw network errors so callers can distinguish between "not found" and "unreachable".
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}
