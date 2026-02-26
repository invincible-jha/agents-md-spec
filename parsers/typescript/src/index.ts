// SPDX-License-Identifier: MIT
// Copyright (c) 2026 MuVeraAI Corporation

/**
 * agents-md — TypeScript parser for the AGENTS.md specification.
 *
 * AGENTS.md is a machine-readable file that website operators place at the root
 * of their web property to declare their interaction policies for AI agents.
 * It is analogous to robots.txt but designed for autonomous AI agents that
 * perform actions, not just read content.
 *
 * Specification: AGENTS-MD-SPEC-001
 * License: MIT (this package), CC BY-SA 4.0 (the specification)
 *
 * @module agents-md
 *
 * @example
 * ```typescript
 * import { AgentsMdParser, fetchPolicy, validate } from 'agents-md';
 *
 * // Parse from a string
 * const parser = new AgentsMdParser();
 * const result = parser.parse(fileContent);
 * if (result.success && result.policy) {
 *   console.log(result.policy.identity.site);
 * }
 *
 * // Fetch and parse from a URL
 * const fetchedResult = await fetchPolicy('https://example.com');
 * if (fetchedResult?.success && fetchedResult.policy) {
 *   const validation = validate(fetchedResult.policy);
 *   console.log(validation.valid);
 * }
 * ```
 */

export { AgentsMdParser } from './parser.js';
export { validate } from './validator.js';
export { fetchPolicy, FetchPolicyError } from './fetcher.js';
export type { FetchPolicyOptions } from './fetcher.js';
export type {
  AgentIdentification,
  AgentsPolicy,
  DataHandling,
  IdentitySection,
  ParseError,
  ParseResult,
  ParseWarning,
  RateLimits,
  Restrictions,
  TrustRequirements,
  ValidationResult,
} from './types.js';
