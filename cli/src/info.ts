// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 MuVeraAI Corporation

/**
 * Info command — displays a human-readable summary of an AGENTS.md file.
 *
 * Shows:
 * - Agent/site name from Identity
 * - Total directive count
 * - Trust level with its generic name
 * - Authentication requirement
 * - Which actions are explicitly allowed / denied
 * - Data handling summary
 * - Rate limit summary
 * - Restriction count (disallowed paths, approval-required paths)
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
  TRUST_LEVEL_NAMES,
  KNOWN_SECTIONS,
} from './parser.js';

/** The result of an info run. */
export interface InfoResult {
  readonly filePath: string;
  readonly found: boolean;
  readonly site?: string;
  readonly contact?: string;
  readonly lastUpdated?: string;
  readonly specVersion?: string;
  readonly minimumTrustLevel?: number;
  readonly trustLevelName?: string;
  readonly authentication?: string;
  readonly allowedActions: readonly string[];
  readonly deniedActions: readonly string[];
  readonly requestsPerMinute?: number;
  readonly requestsPerHour?: number;
  readonly concurrentSessions?: number;
  readonly personalDataCollection?: string;
  readonly dataRetention?: string;
  readonly thirdPartySharing?: string;
  readonly disallowedPathCount: number;
  readonly approvalRequiredPathCount: number;
  readonly readOnlyPathCount: number;
  readonly requireAgentHeader?: boolean;
  readonly requireDisclosure?: boolean;
  readonly sectionCount: number;
  readonly knownSectionCount: number;
  readonly totalDirectiveCount: number;
}

/**
 * Reads an AGENTS.md file and returns a structured info summary.
 *
 * @param filePath - Path to the AGENTS.md file to summarize.
 * @returns An InfoResult with the summary data.
 */
export function infoFile(filePath: string): InfoResult {
  const resolvedPath = resolve(filePath);

  const notFoundResult: InfoResult = {
    filePath: resolvedPath,
    found: false,
    allowedActions: [],
    deniedActions: [],
    disallowedPathCount: 0,
    approvalRequiredPathCount: 0,
    readOnlyPathCount: 0,
    sectionCount: 0,
    knownSectionCount: 0,
    totalDirectiveCount: 0,
  };

  if (!existsSync(resolvedPath)) {
    return notFoundResult;
  }

  let content: string;
  try {
    content = readFileSync(resolvedPath, 'utf-8');
  } catch {
    return notFoundResult;
  }

  if (!content.trim()) {
    return notFoundResult;
  }

  const { sections } = parseRaw(content);

  const totalDirectiveCount = sections.reduce(
    (sum, section) => sum + section.directives.length,
    0,
  );

  const knownSectionCount = sections.filter((section) =>
    KNOWN_SECTIONS.includes(section.name),
  ).length;

  // Identity
  const identitySection = findSection(sections, 'identity');
  const site = identitySection ? getDirective(identitySection, 'site') : undefined;
  const contact = identitySection ? getDirective(identitySection, 'contact') : undefined;
  const lastUpdated = identitySection
    ? getDirective(identitySection, 'last-updated')
    : undefined;
  const specVersion = identitySection
    ? getDirective(identitySection, 'spec-version')
    : undefined;

  // Trust Requirements
  const trustSection = findSection(sections, 'trust requirements');
  let minimumTrustLevel: number | undefined;
  let trustLevelName: string | undefined;
  let authentication: string | undefined;

  if (trustSection) {
    const rawLevel = getDirective(trustSection, 'minimum-trust-level');
    if (rawLevel !== undefined) {
      const parsed = parseInteger(rawLevel);
      if (parsed !== undefined && parsed >= 0 && parsed <= 5) {
        minimumTrustLevel = parsed;
        trustLevelName = TRUST_LEVEL_NAMES[parsed];
      }
    }
    authentication = getDirective(trustSection, 'authentication');
  } else {
    minimumTrustLevel = 0;
    trustLevelName = TRUST_LEVEL_NAMES[0];
    authentication = 'none';
  }

  // Allowed Actions
  const actionsSection = findSection(sections, 'allowed actions');
  const allowedActions: string[] = [];
  const deniedActions: string[] = [];

  if (actionsSection) {
    for (const directive of actionsSection.directives) {
      const boolValue = parseBoolean(directive.value);
      if (boolValue === true) {
        allowedActions.push(directive.key);
      } else if (boolValue === false) {
        deniedActions.push(directive.key);
      }
    }
  } else {
    // Spec default: read-content is allowed.
    allowedActions.push('read-content (default)');
  }

  // Rate Limits
  const rateLimitsSection = findSection(sections, 'rate limits');
  let requestsPerMinute: number | undefined;
  let requestsPerHour: number | undefined;
  let concurrentSessions: number | undefined;

  if (rateLimitsSection) {
    const rawRpm = getDirective(rateLimitsSection, 'requests-per-minute');
    if (rawRpm !== undefined) requestsPerMinute = parseInteger(rawRpm);

    const rawRph = getDirective(rateLimitsSection, 'requests-per-hour');
    if (rawRph !== undefined) requestsPerHour = parseInteger(rawRph);

    const rawConcurrent = getDirective(rateLimitsSection, 'concurrent-sessions');
    if (rawConcurrent !== undefined) concurrentSessions = parseInteger(rawConcurrent);
  }

  // Data Handling
  const dataHandlingSection = findSection(sections, 'data handling');
  const personalDataCollection = dataHandlingSection
    ? getDirective(dataHandlingSection, 'personal-data-collection')
    : undefined;
  const dataRetention = dataHandlingSection
    ? getDirective(dataHandlingSection, 'data-retention')
    : undefined;
  const thirdPartySharing = dataHandlingSection
    ? getDirective(dataHandlingSection, 'third-party-sharing')
    : undefined;

  // Restrictions
  const restrictionsSection = findSection(sections, 'restrictions');
  let disallowedPathCount = 0;
  let approvalRequiredPathCount = 0;
  let readOnlyPathCount = 0;

  if (restrictionsSection) {
    const rawDisallowed = getDirective(restrictionsSection, 'disallowed-paths');
    if (rawDisallowed) disallowedPathCount = parseArray(rawDisallowed).length;

    const rawApproval = getDirective(restrictionsSection, 'require-human-approval');
    if (rawApproval) approvalRequiredPathCount = parseArray(rawApproval).length;

    const rawReadOnly = getDirective(restrictionsSection, 'read-only-paths');
    if (rawReadOnly) readOnlyPathCount = parseArray(rawReadOnly).length;
  }

  // Agent Identification
  const agentIdentSection = findSection(sections, 'agent identification');
  let requireAgentHeader: boolean | undefined;
  let requireDisclosure: boolean | undefined;

  if (agentIdentSection) {
    const rawRequireHeader = getDirective(agentIdentSection, 'require-agent-header');
    if (rawRequireHeader !== undefined) requireAgentHeader = parseBoolean(rawRequireHeader);

    const rawRequireDisclosure = getDirective(agentIdentSection, 'require-disclosure');
    if (rawRequireDisclosure !== undefined) requireDisclosure = parseBoolean(rawRequireDisclosure);
  }

  return {
    filePath: resolvedPath,
    found: true,
    site,
    contact,
    lastUpdated,
    specVersion,
    minimumTrustLevel,
    trustLevelName,
    authentication,
    allowedActions,
    deniedActions,
    requestsPerMinute,
    requestsPerHour,
    concurrentSessions,
    personalDataCollection,
    dataRetention,
    thirdPartySharing,
    disallowedPathCount,
    approvalRequiredPathCount,
    readOnlyPathCount,
    requireAgentHeader,
    requireDisclosure,
    sectionCount: sections.length,
    knownSectionCount,
    totalDirectiveCount,
  };
}
