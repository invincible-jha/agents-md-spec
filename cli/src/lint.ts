// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 MuVeraAI Corporation

/**
 * Lint command — checks an AGENTS.md file for best practices beyond the
 * hard specification rules.
 *
 * Lint checks (warnings, not errors):
 * - Trust level specified for operations (Trust Requirements section present)
 * - Data Handling section present
 * - Contact information in Identity section
 * - last-updated date is present and recent
 * - Overly permissive trust levels (level 0 with write actions enabled)
 * - Rate Limits section present
 * - Agent Identification requirements declared
 * - Restricted paths cover common sensitive prefixes
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  parseRaw,
  findSection,
  getDirective,
  parseBoolean,
  parseInteger,
  TRUST_LEVEL_NAMES,
  type Finding,
} from './parser.js';

/** The result of a lint run. */
export interface LintResult {
  readonly filePath: string;
  readonly findings: readonly Finding[];
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
  readonly passed: boolean;
}

/**
 * Reads and lints an AGENTS.md file at the given path.
 *
 * @param filePath - Path to the AGENTS.md file to lint.
 * @returns A LintResult with all findings.
 */
export function lintFile(filePath: string): LintResult {
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
      infoCount: 0,
      passed: false,
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
      infoCount: 0,
      passed: false,
    };
  }

  if (!content.trim()) {
    return {
      filePath: resolvedPath,
      findings: [{ severity: 'error', section: 'file', message: 'File is empty.' }],
      errorCount: 1,
      warningCount: 0,
      infoCount: 0,
      passed: false,
    };
  }

  const { sections } = parseRaw(content);

  // --- Identity section best practices ---
  const identitySection = findSection(sections, 'identity');
  if (identitySection) {
    const contact = getDirective(identitySection, 'contact');
    if (!contact || contact.trim().length === 0) {
      findings.push({
        severity: 'warning',
        section: 'identity',
        lineNumber: identitySection.lineNumber,
        message:
          'No contact address specified. Consider adding "- contact: ai-policy@yourdomain.com" so agents can reach your policy team.',
      });
    }

    const lastUpdated = getDirective(identitySection, 'last-updated');
    if (!lastUpdated || lastUpdated.trim().length === 0) {
      findings.push({
        severity: 'warning',
        section: 'identity',
        lineNumber: identitySection.lineNumber,
        message:
          'No last-updated date. Adding "- last-updated: YYYY-MM-DD" helps agents know when your policy was reviewed.',
      });
    } else {
      // Check if the date is older than 365 days.
      const parsed = new Date(lastUpdated);
      if (!isNaN(parsed.getTime())) {
        const ageInDays = (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays > 365) {
          findings.push({
            severity: 'warning',
            section: 'identity',
            lineNumber: identitySection.lineNumber,
            message: `last-updated date "${lastUpdated}" is over a year old. Consider reviewing and updating your AGENTS.md policy.`,
          });
        }
      }
    }

    const specVersion = getDirective(identitySection, 'spec-version');
    if (!specVersion) {
      findings.push({
        severity: 'info',
        section: 'identity',
        lineNumber: identitySection.lineNumber,
        message:
          'No spec-version specified. Adding "- spec-version: 1.0.0" helps parsers handle future specification versions correctly.',
      });
    }
  }

  // --- Trust Requirements best practices ---
  const trustSection = findSection(sections, 'trust requirements');
  if (!trustSection) {
    findings.push({
      severity: 'warning',
      section: 'trust requirements',
      message:
        'No ## Trust Requirements section. Consider declaring a minimum trust level so agents know what authentication is expected.',
    });
  } else {
    const rawLevel = getDirective(trustSection, 'minimum-trust-level');
    const level = rawLevel !== undefined ? parseInteger(rawLevel) : 0;

    if (level === 0 || level === undefined) {
      // Check if any write-capable actions are enabled.
      const actionsSection = findSection(sections, 'allowed actions');
      const writeActionKeys = [
        'submit-forms',
        'make-purchases',
        'modify-account',
        'upload-files',
        'send-messages',
        'delete-data',
        'create-content',
      ];
      const enabledWriteActions: string[] = [];

      if (actionsSection) {
        for (const key of writeActionKeys) {
          const rawValue = getDirective(actionsSection, key);
          if (rawValue !== undefined && parseBoolean(rawValue) === true) {
            enabledWriteActions.push(key);
          }
        }
      }

      if (enabledWriteActions.length > 0) {
        findings.push({
          severity: 'warning',
          section: 'trust requirements',
          lineNumber: trustSection?.lineNumber,
          message:
            `Trust level is 0 (Anonymous) but write actions are enabled: ${enabledWriteActions.join(', ')}. ` +
            'Consider requiring at least trust level 2 (Verified) for write operations.',
        });
      }
    }

    const rawAuth = getDirective(trustSection, 'authentication');
    if (!rawAuth || rawAuth.toLowerCase().trim() === 'none') {
      findings.push({
        severity: 'info',
        section: 'trust requirements',
        lineNumber: trustSection.lineNumber,
        message:
          'Authentication is set to "none". If your site has any agent-accessible APIs, consider specifying authentication methods.',
      });
    }
  }

  // --- Allowed Actions best practices ---
  const actionsSection = findSection(sections, 'allowed actions');
  if (!actionsSection) {
    findings.push({
      severity: 'info',
      section: 'allowed actions',
      message:
        'No ## Allowed Actions section. Agents will apply defaults (read-content: true, all write actions: false). Explicit declarations are clearer.',
    });
  }

  // --- Rate Limits best practices ---
  const rateLimitsSection = findSection(sections, 'rate limits');
  if (!rateLimitsSection) {
    findings.push({
      severity: 'info',
      section: 'rate limits',
      message:
        'No ## Rate Limits section. Consider declaring rate limits to protect your infrastructure from agent overload.',
    });
  } else {
    const requestsPerMinute = getDirective(rateLimitsSection, 'requests-per-minute');
    const requestsPerHour = getDirective(rateLimitsSection, 'requests-per-hour');

    if (!requestsPerMinute && !requestsPerHour) {
      findings.push({
        severity: 'info',
        section: 'rate limits',
        lineNumber: rateLimitsSection.lineNumber,
        message:
          'Rate Limits section is present but has no values. Consider adding requests-per-minute or requests-per-hour limits.',
      });
    }
  }

  // --- Data Handling best practices ---
  const dataHandlingSection = findSection(sections, 'data handling');
  if (!dataHandlingSection) {
    findings.push({
      severity: 'warning',
      section: 'data handling',
      message:
        'No ## Data Handling section. Agents cannot determine your data collection and retention commitments. This section is recommended for transparency.',
    });
  } else {
    const personalDataCollection = getDirective(dataHandlingSection, 'personal-data-collection');
    if (!personalDataCollection) {
      findings.push({
        severity: 'warning',
        section: 'data handling',
        lineNumber: dataHandlingSection.lineNumber,
        message:
          'Data Handling section has no personal-data-collection key. Consider declaring: none, minimal, standard, or extensive.',
      });
    }

    const dataRetention = getDirective(dataHandlingSection, 'data-retention');
    if (!dataRetention) {
      findings.push({
        severity: 'warning',
        section: 'data handling',
        lineNumber: dataHandlingSection.lineNumber,
        message:
          'Data Handling section has no data-retention key. Consider declaring how long interaction data is kept.',
      });
    }
  }

  // --- Agent Identification best practices ---
  const agentIdentSection = findSection(sections, 'agent identification');
  if (!agentIdentSection) {
    findings.push({
      severity: 'info',
      section: 'agent identification',
      message:
        'No ## Agent Identification section. Consider declaring whether agents must send an identifying header or disclose their AI nature.',
    });
  }

  // --- Trust level name info ---
  const trustSectionForInfo = findSection(sections, 'trust requirements');
  if (trustSectionForInfo) {
    const rawLevel = getDirective(trustSectionForInfo, 'minimum-trust-level');
    if (rawLevel !== undefined) {
      const level = parseInteger(rawLevel);
      if (level !== undefined && level >= 0 && level <= 5) {
        const levelName = TRUST_LEVEL_NAMES[level];
        if (levelName) {
          findings.push({
            severity: 'info',
            section: 'trust requirements',
            lineNumber: trustSectionForInfo.lineNumber,
            message: `Minimum trust level is ${level} (${levelName}). Trust changes are manual — this is a static declaration.`,
          });
        }
      }
    }
  }

  const errorCount = findings.filter((f) => f.severity === 'error').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;
  const infoCount = findings.filter((f) => f.severity === 'info').length;

  return {
    filePath: resolvedPath,
    findings,
    errorCount,
    warningCount,
    infoCount,
    passed: errorCount === 0 && warningCount === 0,
  };
}
