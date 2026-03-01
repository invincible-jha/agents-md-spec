// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 MuVeraAI Corporation

/**
 * Validate command — parses and validates an AGENTS.md file against the
 * AGENTS-MD-SPEC-001 specification.
 *
 * Checks:
 * - Required Identity section is present with a "site" key
 * - Trust levels are within the valid 0-5 range
 * - Rate limit values are positive integers
 * - Data handling uses valid enumerated values
 * - Path patterns start with "/"
 * - Boolean fields contain valid boolean values
 * - Authentication values are one of: required, optional, none
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  parseRaw,
  findSection,
  getDirective,
  parseBoolean,
  parseInteger,
  parseArray,
  type Finding,
} from './parser.js';

/** The result of a validate run. */
export interface ValidateResult {
  readonly filePath: string;
  readonly findings: readonly Finding[];
  readonly errorCount: number;
  readonly warningCount: number;
  readonly valid: boolean;
}

/**
 * Reads and validates an AGENTS.md file at the given path.
 *
 * @param filePath - Path to the AGENTS.md file to validate.
 * @returns A ValidateResult with all findings and summary counts.
 */
export function validateFile(filePath: string): ValidateResult {
  const resolvedPath = resolve(filePath);
  const findings: Finding[] = [];

  if (!existsSync(resolvedPath)) {
    return {
      filePath: resolvedPath,
      findings: [
        {
          severity: 'error',
          section: 'file',
          message: `File not found: ${resolvedPath}`,
        },
      ],
      errorCount: 1,
      warningCount: 0,
      valid: false,
    };
  }

  let content: string;
  try {
    content = readFileSync(resolvedPath, 'utf-8');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      filePath: resolvedPath,
      findings: [
        {
          severity: 'error',
          section: 'file',
          message: `Could not read file: ${message}`,
        },
      ],
      errorCount: 1,
      warningCount: 0,
      valid: false,
    };
  }

  if (!content.trim()) {
    return {
      filePath: resolvedPath,
      findings: [{ severity: 'error', section: 'file', message: 'File is empty.' }],
      errorCount: 1,
      warningCount: 0,
      valid: false,
    };
  }

  const { sections, hasTitleHeading } = parseRaw(content);

  // Warn if the standard title heading is absent.
  if (!hasTitleHeading) {
    findings.push({
      severity: 'warning',
      section: 'file',
      message: 'Missing "# AGENTS.md" title heading. The first line should be "# AGENTS.md".',
    });
  }

  // --- Identity section (REQUIRED) ---
  const identitySection = findSection(sections, 'identity');
  if (!identitySection) {
    findings.push({
      severity: 'error',
      section: 'identity',
      message:
        'Missing required ## Identity section. An AGENTS.md file must contain an Identity section.',
    });
  } else {
    const site = getDirective(identitySection, 'site');
    if (!site || site.trim().length === 0) {
      findings.push({
        severity: 'error',
        section: 'identity',
        lineNumber: identitySection.lineNumber,
        message: 'Identity section is missing the required "site" key.',
      });
    } else {
      if (site.includes('://')) {
        findings.push({
          severity: 'error',
          section: 'identity',
          lineNumber: identitySection.lineNumber,
          message: `Identity.site "${site}" must be a domain name only (without protocol). Example: "example.com".`,
        });
      }
      if (site.includes(' ')) {
        findings.push({
          severity: 'error',
          section: 'identity',
          lineNumber: identitySection.lineNumber,
          message: `Identity.site "${site}" must not contain spaces.`,
        });
      }
    }

    const lastUpdated = getDirective(identitySection, 'last-updated');
    if (lastUpdated !== undefined) {
      const isoDatePattern =
        /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;
      if (!isoDatePattern.test(lastUpdated)) {
        findings.push({
          severity: 'error',
          section: 'identity',
          lineNumber: identitySection.lineNumber,
          message: `Identity.last-updated "${lastUpdated}" is not a valid ISO 8601 date (expected YYYY-MM-DD or full ISO 8601).`,
        });
      }
    }
  }

  // --- Trust Requirements section (OPTIONAL) ---
  const trustSection = findSection(sections, 'trust requirements');
  if (trustSection) {
    const rawLevel = getDirective(trustSection, 'minimum-trust-level');
    if (rawLevel !== undefined) {
      const level = parseInteger(rawLevel);
      if (level === undefined) {
        findings.push({
          severity: 'error',
          section: 'trust requirements',
          lineNumber: trustSection.lineNumber,
          message: `Trust level "${rawLevel}" is not a valid integer. Expected a number between 0 and 5.`,
        });
      } else if (level < 0 || level > 5) {
        findings.push({
          severity: 'error',
          section: 'trust requirements',
          lineNumber: trustSection.lineNumber,
          message: `Trust level ${level} is outside the valid 0-5 range. Valid levels: 0 (Anonymous) through 5 (Administrative).`,
        });
      }
    }

    const rawAuth = getDirective(trustSection, 'authentication');
    if (rawAuth !== undefined) {
      const validAuthValues = ['required', 'optional', 'none'];
      if (!validAuthValues.includes(rawAuth.toLowerCase().trim())) {
        findings.push({
          severity: 'error',
          section: 'trust requirements',
          lineNumber: trustSection.lineNumber,
          message: `Authentication value "${rawAuth}" is not valid. Expected one of: required, optional, none.`,
        });
      }
    }
  }

  // --- Allowed Actions section (OPTIONAL) ---
  const actionsSection = findSection(sections, 'allowed actions');
  if (actionsSection) {
    for (const directive of actionsSection.directives) {
      const boolValue = parseBoolean(directive.value);
      if (boolValue === undefined) {
        findings.push({
          severity: 'error',
          section: 'allowed actions',
          lineNumber: actionsSection.lineNumber,
          message: `Action key "${directive.key}" has invalid boolean value "${directive.value}". Expected: true/false/yes/no/1/0/on/off.`,
        });
      }
    }
  }

  // --- Rate Limits section (OPTIONAL) ---
  const rateLimitsSection = findSection(sections, 'rate limits');
  if (rateLimitsSection) {
    const integerKeys = ['requests-per-minute', 'requests-per-hour', 'concurrent-sessions'];
    for (const key of integerKeys) {
      const rawValue = getDirective(rateLimitsSection, key);
      if (rawValue !== undefined) {
        const intValue = parseInteger(rawValue);
        if (intValue === undefined) {
          findings.push({
            severity: 'error',
            section: 'rate limits',
            lineNumber: rateLimitsSection.lineNumber,
            message: `Rate limit "${key}" has invalid integer value "${rawValue}". Expected a non-negative integer.`,
          });
        } else if (intValue < 0) {
          findings.push({
            severity: 'error',
            section: 'rate limits',
            lineNumber: rateLimitsSection.lineNumber,
            message: `Rate limit "${key}" value ${intValue} must be a non-negative integer (0 = unlimited).`,
          });
        }
      }
    }
  }

  // --- Data Handling section (OPTIONAL) ---
  const dataHandlingSection = findSection(sections, 'data handling');
  if (dataHandlingSection) {
    const collectionValue = getDirective(dataHandlingSection, 'personal-data-collection');
    if (collectionValue !== undefined) {
      const validValues = ['none', 'minimal', 'standard', 'extensive'];
      if (!validValues.includes(collectionValue.toLowerCase().trim())) {
        findings.push({
          severity: 'error',
          section: 'data handling',
          lineNumber: dataHandlingSection.lineNumber,
          message: `personal-data-collection "${collectionValue}" is not valid. Expected one of: ${validValues.join(', ')}.`,
        });
      }
    }

    const retentionValue = getDirective(dataHandlingSection, 'data-retention');
    if (retentionValue !== undefined) {
      const validValues = ['none', 'session-only', '30-days', '1-year', 'indefinite'];
      if (!validValues.includes(retentionValue.toLowerCase().trim())) {
        findings.push({
          severity: 'error',
          section: 'data handling',
          lineNumber: dataHandlingSection.lineNumber,
          message: `data-retention "${retentionValue}" is not valid. Expected one of: ${validValues.join(', ')}.`,
        });
      }
    }

    const sharingValue = getDirective(dataHandlingSection, 'third-party-sharing');
    if (sharingValue !== undefined) {
      const validValues = ['none', 'anonymized', 'with-consent', 'unrestricted'];
      if (!validValues.includes(sharingValue.toLowerCase().trim())) {
        findings.push({
          severity: 'error',
          section: 'data handling',
          lineNumber: dataHandlingSection.lineNumber,
          message: `third-party-sharing "${sharingValue}" is not valid. Expected one of: ${validValues.join(', ')}.`,
        });
      }
    }

    const gdprValue = getDirective(dataHandlingSection, 'gdpr-compliance');
    if (gdprValue !== undefined && parseBoolean(gdprValue) === undefined) {
      findings.push({
        severity: 'error',
        section: 'data handling',
        lineNumber: dataHandlingSection.lineNumber,
        message: `gdpr-compliance "${gdprValue}" is not a valid boolean. Expected: true/false/yes/no.`,
      });
    }
  }

  // --- Restrictions section (OPTIONAL) ---
  const restrictionsSection = findSection(sections, 'restrictions');
  if (restrictionsSection) {
    const pathKeys = ['disallowed-paths', 'require-human-approval', 'read-only-paths'];
    for (const key of pathKeys) {
      const rawValue = getDirective(restrictionsSection, key);
      if (rawValue !== undefined) {
        const paths = parseArray(rawValue);
        for (const path of paths) {
          if (!path.startsWith('/')) {
            findings.push({
              severity: 'error',
              section: 'restrictions',
              lineNumber: restrictionsSection.lineNumber,
              message: `Path pattern "${path}" in "${key}" must start with "/". All path patterns must be absolute paths.`,
            });
          }
        }
      }
    }
  }

  // --- Agent Identification section (OPTIONAL) ---
  const agentIdentSection = findSection(sections, 'agent identification');
  if (agentIdentSection) {
    const boolKeys = ['require-agent-header', 'require-disclosure'];
    for (const key of boolKeys) {
      const rawValue = getDirective(agentIdentSection, key);
      if (rawValue !== undefined && parseBoolean(rawValue) === undefined) {
        findings.push({
          severity: 'error',
          section: 'agent identification',
          lineNumber: agentIdentSection.lineNumber,
          message: `"${key}" has invalid boolean value "${rawValue}". Expected: true/false/yes/no/1/0/on/off.`,
        });
      }
    }
  }

  const errorCount = findings.filter((finding) => finding.severity === 'error').length;
  const warningCount = findings.filter((finding) => finding.severity === 'warning').length;

  return {
    filePath: resolvedPath,
    findings,
    errorCount,
    warningCount,
    valid: errorCount === 0,
  };
}
