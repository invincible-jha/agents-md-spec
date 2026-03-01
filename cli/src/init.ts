// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 MuVeraAI Corporation

/**
 * Init command — generates a template AGENTS.md file.
 *
 * Builds a well-structured AGENTS.md template from the inputs provided
 * (or uses sensible defaults when none are given). The generated file
 * includes all major sections with comments explaining each field,
 * consistent with AGENTS-MD-SPEC-001.
 *
 * Note: Trust changes are MANUAL ONLY. The generated template sets
 * static trust level declarations — no adaptive logic.
 */

import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Options for generating an AGENTS.md template. */
export interface InitOptions {
  /** The domain name of the site (without protocol). */
  readonly siteName: string;
  /** Contact email for AI policy inquiries. */
  readonly contact?: string;
  /** Minimum trust level (0-5). */
  readonly trustLevel: number;
  /** Authentication requirement: required | optional | none. */
  readonly authentication: 'required' | 'optional' | 'none';
  /** Whether to allow read-content actions. */
  readonly allowReadContent: boolean;
  /** Whether to allow API access. */
  readonly allowApiAccess: boolean;
  /** Whether to allow form submission. */
  readonly allowFormSubmit: boolean;
  /** Personal data collection level. */
  readonly personalDataCollection: 'none' | 'minimal' | 'standard' | 'extensive';
  /** Data retention policy. */
  readonly dataRetention: 'none' | 'session-only' | '30-days' | '1-year' | 'indefinite';
  /** Rate limit: requests per minute (0 = no limit). */
  readonly requestsPerMinute?: number;
  /** Rate limit: requests per hour (0 = no limit). */
  readonly requestsPerHour?: number;
}

/** Default options for the init template. */
export const DEFAULT_INIT_OPTIONS: Readonly<InitOptions> = {
  siteName: 'example.com',
  contact: undefined,
  trustLevel: 0,
  authentication: 'none',
  allowReadContent: true,
  allowApiAccess: false,
  allowFormSubmit: false,
  personalDataCollection: 'minimal',
  dataRetention: 'session-only',
  requestsPerMinute: 30,
  requestsPerHour: 500,
};

/** Trust level names on the generic 0-5 scale. */
const TRUST_LEVEL_NAMES: Record<number, string> = {
  0: 'Anonymous',
  1: 'Identified',
  2: 'Verified',
  3: 'Authorized',
  4: 'Privileged',
  5: 'Administrative',
};

/**
 * Generates the AGENTS.md content string from the given options.
 *
 * @param options - The init options to use.
 * @returns The generated AGENTS.md content as a string.
 */
export function generateAgentsMd(options: Readonly<InitOptions>): string {
  const today = new Date().toISOString().split('T')[0] ?? '';
  const trustLevelName = TRUST_LEVEL_NAMES[options.trustLevel] ?? 'Anonymous';

  const lines: string[] = [
    '# AGENTS.md',
    '',
    '# This file declares AI agent interaction policies for this web property.',
    '# Specification: AGENTS-MD-SPEC-001 — https://github.com/aumos-ai/agents-md-spec',
    '',
    '## Identity',
    `- site: ${options.siteName}`,
  ];

  if (options.contact) {
    lines.push(`- contact: ${options.contact}`);
  } else {
    lines.push('# - contact: ai-policy@yourdomain.com');
  }

  lines.push(`- last-updated: ${today}`);
  lines.push('- spec-version: 1.0.0');
  lines.push('');

  lines.push('## Trust Requirements');
  lines.push(
    `# Trust level ${options.trustLevel} = ${trustLevelName}. Trust changes are MANUAL ONLY.`,
  );
  lines.push(`# Levels: 0 (Anonymous) 1 (Identified) 2 (Verified) 3 (Authorized) 4 (Privileged) 5 (Administrative)`);
  lines.push(`- minimum-trust-level: ${options.trustLevel}`);
  lines.push(`- authentication: ${options.authentication}`);
  lines.push('');

  lines.push('## Allowed Actions');
  lines.push(`- read-content: ${options.allowReadContent}`);
  lines.push(`- submit-forms: ${options.allowFormSubmit}`);
  lines.push('- make-purchases: false');
  lines.push('- modify-account: false');
  lines.push(`- access-api: ${options.allowApiAccess}`);
  lines.push('- download-files: false');
  lines.push('- upload-files: false');
  lines.push('- send-messages: false');
  lines.push('- delete-data: false');
  lines.push('- create-content: false');
  lines.push('');

  lines.push('## Rate Limits');
  if (options.requestsPerMinute !== undefined) {
    lines.push(`- requests-per-minute: ${options.requestsPerMinute}`);
  }
  if (options.requestsPerHour !== undefined) {
    lines.push(`- requests-per-hour: ${options.requestsPerHour}`);
  }
  lines.push('- concurrent-sessions: 3');
  lines.push('');

  lines.push('## Data Handling');
  lines.push(`- personal-data-collection: ${options.personalDataCollection}`);
  lines.push(`- data-retention: ${options.dataRetention}`);
  lines.push('- third-party-sharing: none');
  lines.push('- gdpr-compliance: false');
  lines.push('');

  lines.push('## Restrictions');
  lines.push('# List paths agents must not access. Glob patterns: /admin/* /internal/**');
  lines.push('# - disallowed-paths: /admin/*, /internal/*');
  lines.push('# - require-human-approval: /checkout/*');
  lines.push('# - read-only-paths: /blog/*, /docs/*');
  lines.push('');

  lines.push('## Agent Identification');
  lines.push('- require-agent-header: false');
  lines.push('# - agent-header-name: X-Agent-Identity');
  lines.push('- require-disclosure: false');
  lines.push('');

  return lines.join('\n');
}

/** Result of the init command. */
export interface InitResult {
  readonly outputPath: string;
  readonly alreadyExisted: boolean;
  readonly content: string;
}

/**
 * Writes an AGENTS.md template to the given directory.
 *
 * @param directory - The directory to write AGENTS.md into.
 * @param options - The init options to use for generation.
 * @param overwrite - Whether to overwrite an existing file.
 * @returns An InitResult describing what happened.
 */
export function initFile(
  directory: string,
  options: Readonly<InitOptions>,
  overwrite: boolean,
): InitResult {
  const outputPath = resolve(directory, 'AGENTS.md');
  const alreadyExisted = existsSync(outputPath);

  const content = generateAgentsMd(options);

  if (!alreadyExisted || overwrite) {
    writeFileSync(outputPath, content, 'utf-8');
  }

  return { outputPath, alreadyExisted, content };
}
