// SPDX-License-Identifier: MIT
// Copyright (c) 2026 MuVeraAI Corporation

import type {
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
} from './types.js';

/**
 * Internal representation of a parsed section from the AGENTS.md file.
 * Maps lowercase keys to their raw string values.
 */
type SectionData = Map<string, string>;

/**
 * Parses AGENTS.md content into a structured AgentsPolicy.
 *
 * Usage:
 * ```typescript
 * const parser = new AgentsMdParser();
 * const result = parser.parse(fileContent);
 * if (result.success && result.policy) {
 *   console.log(result.policy.identity.site);
 * }
 * ```
 */
export class AgentsMdParser {
  /**
   * Parses the raw string content of an AGENTS.md file.
   *
   * @param content - The raw UTF-8 string content of the AGENTS.md file.
   * @returns A ParseResult containing the policy (on success), errors, and warnings.
   */
  public parse(content: string): ParseResult {
    const errors: ParseError[] = [];
    const warnings: ParseWarning[] = [];

    if (!content || content.trim().length === 0) {
      return {
        success: false,
        errors: [{ section: 'file', message: 'File is empty.' }],
        warnings: [],
      };
    }

    const sections = this.extractSections(content);

    // Identity is the only REQUIRED section.
    if (!sections.has('identity')) {
      return {
        success: false,
        errors: [
          {
            section: 'identity',
            message:
              'Missing required ## Identity section. An AGENTS.md file must contain an Identity section.',
          },
        ],
        warnings: [],
      };
    }

    const identityData = sections.get('identity')!;
    const identityResult = this.parseIdentitySection(identityData, warnings);
    if (!identityResult) {
      return {
        success: false,
        errors: [
          {
            section: 'identity',
            message: 'The Identity section is missing the required "site" key.',
          },
        ],
        warnings,
      };
    }

    const trustRequirements = this.parseTrustRequirements(
      sections.get('trust requirements'),
      warnings,
    );
    const allowedActions = this.parseAllowedActions(
      sections.get('allowed actions'),
      warnings,
    );
    const rateLimits = this.parseRateLimits(sections.get('rate limits'), warnings);
    const dataHandling = this.parseDataHandling(sections.get('data handling'), warnings);
    const restrictions = this.parseRestrictions(sections.get('restrictions'), warnings);
    const agentIdentification = this.parseAgentIdentification(
      sections.get('agent identification'),
      warnings,
    );

    const policy: AgentsPolicy = {
      identity: identityResult,
      trustRequirements,
      allowedActions,
      rateLimits,
      dataHandling,
      restrictions,
      agentIdentification,
    };

    return {
      success: errors.length === 0,
      policy,
      errors,
      warnings,
    };
  }

  /**
   * Splits the file content into named sections by level-2 Markdown headings.
   * Section names are normalized to lowercase.
   *
   * @param content - Raw file content.
   * @returns A Map from normalized section name to the section's raw text content.
   */
  private extractSections(content: string): Map<string, SectionData> {
    const result = new Map<string, SectionData>();
    const lines = content.split(/\r?\n/);
    let currentSectionName: string | null = null;
    let currentSectionLines: string[] = [];

    const flushSection = (): void => {
      if (currentSectionName !== null) {
        result.set(currentSectionName, this.parseKeyValueLines(currentSectionLines));
        currentSectionLines = [];
      }
    };

    for (const line of lines) {
      const sectionMatch = line.match(/^##\s+(.+)$/);
      if (sectionMatch) {
        flushSection();
        currentSectionName = sectionMatch[1].trim().toLowerCase();
        currentSectionLines = [];
        continue;
      }

      if (currentSectionName !== null) {
        currentSectionLines.push(line);
      }
    }

    flushSection();
    return result;
  }

  /**
   * Parses the lines within a section body into a key-value map.
   * Only lines beginning with "- " are treated as directives.
   * Keys are normalized to lowercase and trimmed.
   * Values are trimmed.
   *
   * @param lines - The raw lines of a section body.
   * @returns A Map from normalized key to raw value string.
   */
  private parseKeyValueLines(lines: string[]): SectionData {
    const data: SectionData = new Map();
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip blank lines and comment lines.
      if (!trimmed || trimmed.startsWith('#')) continue;
      // Only process directive lines starting with "- ".
      if (!trimmed.startsWith('- ')) continue;

      const withoutBullet = trimmed.slice(2);
      const colonIndex = withoutBullet.indexOf(':');
      if (colonIndex === -1) continue;

      const key = withoutBullet.slice(0, colonIndex).trim().toLowerCase();
      const value = withoutBullet.slice(colonIndex + 1).trim();

      if (key.length > 0) {
        data.set(key, value);
      }
    }
    return data;
  }

  /**
   * Converts a raw string value to a boolean.
   * Returns undefined and pushes a warning if the value is not recognized.
   */
  private parseBooleanValue(
    raw: string,
    section: string,
    key: string,
    warnings: ParseWarning[],
  ): boolean | undefined {
    const normalized = raw.toLowerCase().trim();
    if (['true', 'yes', '1', 'on'].includes(normalized)) return true;
    if (['false', 'no', '0', 'off'].includes(normalized)) return false;

    warnings.push({
      section,
      message: `Unrecognized boolean value "${raw}" for key "${key}". Expected: true/false/yes/no/1/0/on/off.`,
    });
    return undefined;
  }

  /**
   * Converts a raw string value to a positive integer.
   * Returns undefined and pushes a warning if the value is not a valid integer.
   */
  private parseIntegerValue(
    raw: string,
    section: string,
    key: string,
    warnings: ParseWarning[],
  ): number | undefined {
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed) || parsed.toString() !== raw.trim()) {
      warnings.push({
        section,
        message: `Invalid integer value "${raw}" for key "${key}".`,
      });
      return undefined;
    }
    return parsed;
  }

  /**
   * Converts a comma-separated string into an array of trimmed, non-empty strings.
   */
  private parseArrayValue(raw: string): string[] {
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  /**
   * Parses the Identity section.
   * Returns null if the required "site" key is absent.
   */
  private parseIdentitySection(
    data: SectionData,
    warnings: ParseWarning[],
  ): IdentitySection | null {
    const site = data.get('site');
    if (!site || site.trim().length === 0) {
      return null;
    }

    const identity: IdentitySection = { site: site.trim() };

    const contact = data.get('contact');
    if (contact) identity.contact = contact;

    const lastUpdated = data.get('last-updated');
    if (lastUpdated) identity.lastUpdated = lastUpdated;

    const specVersion = data.get('spec-version');
    if (specVersion) identity.specVersion = specVersion;

    // Warn about unrecognized keys.
    const knownKeys = new Set(['site', 'contact', 'last-updated', 'spec-version']);
    for (const key of data.keys()) {
      if (!knownKeys.has(key) && !key.startsWith('x-')) {
        warnings.push({
          section: 'identity',
          message: `Unrecognized key "${key}" in Identity section.`,
        });
      }
    }

    return identity;
  }

  /**
   * Parses the Trust Requirements section.
   * Returns specification defaults if the section is absent.
   */
  private parseTrustRequirements(
    data: SectionData | undefined,
    warnings: ParseWarning[],
  ): TrustRequirements {
    const defaults: TrustRequirements = {
      minimumTrustLevel: 0,
      authentication: 'none',
    };

    if (!data) return defaults;

    const result: TrustRequirements = { ...defaults };

    const rawLevel = data.get('minimum-trust-level');
    if (rawLevel !== undefined) {
      const level = this.parseIntegerValue(
        rawLevel,
        'trust requirements',
        'minimum-trust-level',
        warnings,
      );
      if (level !== undefined) {
        if (level < 0 || level > 5) {
          warnings.push({
            section: 'trust requirements',
            message: `Trust level ${level} is outside the valid 0-5 range. Clamping to nearest valid value.`,
          });
          result.minimumTrustLevel = Math.max(0, Math.min(5, level));
        } else {
          result.minimumTrustLevel = level;
        }
      }
    }

    const rawAuth = data.get('authentication');
    if (rawAuth !== undefined) {
      const normalized = rawAuth.toLowerCase().trim();
      if (normalized === 'required' || normalized === 'optional' || normalized === 'none') {
        result.authentication = normalized;
      } else {
        warnings.push({
          section: 'trust requirements',
          message: `Unrecognized authentication value "${rawAuth}". Expected: required/optional/none.`,
        });
      }
    }

    const rawMethods = data.get('authentication-methods');
    if (rawMethods !== undefined) {
      result.authenticationMethods = this.parseArrayValue(rawMethods);
    }

    return result;
  }

  /**
   * Parses the Allowed Actions section.
   * Returns defaults (readContent: true, all others: false) when the section is absent.
   */
  private parseAllowedActions(
    data: SectionData | undefined,
    warnings: ParseWarning[],
  ): Record<string, boolean> {
    const defaults: Record<string, boolean> = {
      readContent: true,
      submitForms: false,
      makePurchases: false,
      modifyAccount: false,
      accessApi: false,
      downloadFiles: false,
      uploadFiles: false,
      sendMessages: false,
      deleteData: false,
      createContent: false,
    };

    if (!data) return defaults;

    // Map from markdown key format to camelCase property name.
    const keyMap: Record<string, string> = {
      'read-content': 'readContent',
      'submit-forms': 'submitForms',
      'make-purchases': 'makePurchases',
      'modify-account': 'modifyAccount',
      'access-api': 'accessApi',
      'download-files': 'downloadFiles',
      'upload-files': 'uploadFiles',
      'send-messages': 'sendMessages',
      'delete-data': 'deleteData',
      'create-content': 'createContent',
    };

    const result: Record<string, boolean> = { ...defaults };

    for (const [rawKey, rawValue] of data.entries()) {
      const camelKey = keyMap[rawKey] ?? this.kebabToCamel(rawKey);
      const boolValue = this.parseBooleanValue(
        rawValue,
        'allowed actions',
        rawKey,
        warnings,
      );
      if (boolValue !== undefined) {
        result[camelKey] = boolValue;
      }
    }

    return result;
  }

  /**
   * Converts a kebab-case string to camelCase.
   * Used for custom action keys not in the standard key map.
   */
  private kebabToCamel(kebab: string): string {
    return kebab.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
  }

  /**
   * Parses the Rate Limits section.
   * Returns an empty object (no limits) if the section is absent.
   */
  private parseRateLimits(
    data: SectionData | undefined,
    warnings: ParseWarning[],
  ): RateLimits {
    if (!data) return {};

    const result: RateLimits = {};

    const rawRpm = data.get('requests-per-minute');
    if (rawRpm !== undefined) {
      const value = this.parseIntegerValue(
        rawRpm,
        'rate limits',
        'requests-per-minute',
        warnings,
      );
      if (value !== undefined) result.requestsPerMinute = value;
    }

    const rawRph = data.get('requests-per-hour');
    if (rawRph !== undefined) {
      const value = this.parseIntegerValue(
        rawRph,
        'rate limits',
        'requests-per-hour',
        warnings,
      );
      if (value !== undefined) result.requestsPerHour = value;
    }

    const rawConcurrent = data.get('concurrent-sessions');
    if (rawConcurrent !== undefined) {
      const value = this.parseIntegerValue(
        rawConcurrent,
        'rate limits',
        'concurrent-sessions',
        warnings,
      );
      if (value !== undefined) result.concurrentSessions = value;
    }

    return result;
  }

  /**
   * Parses the Data Handling section.
   * Returns an empty partial object if the section is absent.
   */
  private parseDataHandling(
    data: SectionData | undefined,
    warnings: ParseWarning[],
  ): Partial<DataHandling> {
    if (!data) return {};

    const result: Partial<DataHandling> = {};

    const validCollectionValues = ['none', 'minimal', 'standard', 'extensive'] as const;
    const rawCollection = data.get('personal-data-collection');
    if (rawCollection !== undefined) {
      const normalized = rawCollection.toLowerCase().trim() as (typeof validCollectionValues)[number];
      if (validCollectionValues.includes(normalized)) {
        result.personalDataCollection = normalized;
      } else {
        warnings.push({
          section: 'data handling',
          message: `Unrecognized personal-data-collection value "${rawCollection}". Expected: none/minimal/standard/extensive.`,
        });
      }
    }

    const validRetentionValues = ['none', 'session-only', '30-days', '1-year', 'indefinite'] as const;
    const rawRetention = data.get('data-retention');
    if (rawRetention !== undefined) {
      const normalized = rawRetention.toLowerCase().trim() as (typeof validRetentionValues)[number];
      if (validRetentionValues.includes(normalized)) {
        result.dataRetention = normalized;
      } else {
        warnings.push({
          section: 'data handling',
          message: `Unrecognized data-retention value "${rawRetention}". Expected: none/session-only/30-days/1-year/indefinite.`,
        });
      }
    }

    const validSharingValues = ['none', 'anonymized', 'with-consent', 'unrestricted'] as const;
    const rawSharing = data.get('third-party-sharing');
    if (rawSharing !== undefined) {
      const normalized = rawSharing.toLowerCase().trim() as (typeof validSharingValues)[number];
      if (validSharingValues.includes(normalized)) {
        result.thirdPartySharing = normalized;
      } else {
        warnings.push({
          section: 'data handling',
          message: `Unrecognized third-party-sharing value "${rawSharing}". Expected: none/anonymized/with-consent/unrestricted.`,
        });
      }
    }

    const rawGdpr = data.get('gdpr-compliance');
    if (rawGdpr !== undefined) {
      const value = this.parseBooleanValue(
        rawGdpr,
        'data handling',
        'gdpr-compliance',
        warnings,
      );
      if (value !== undefined) result.gdprCompliance = value;
    }

    return result;
  }

  /**
   * Parses the Restrictions section.
   * Returns empty arrays if the section is absent.
   */
  private parseRestrictions(
    data: SectionData | undefined,
    warnings: ParseWarning[],
  ): Restrictions {
    if (!data) {
      return {
        disallowedPaths: [],
        requireHumanApproval: [],
        readOnlyPaths: [],
      };
    }

    const parsePaths = (raw: string | undefined): string[] => {
      if (!raw) return [];
      return this.parseArrayValue(raw);
    };

    const restrictions: Restrictions = {
      disallowedPaths: parsePaths(data.get('disallowed-paths')),
      requireHumanApproval: parsePaths(data.get('require-human-approval')),
      readOnlyPaths: parsePaths(data.get('read-only-paths')),
    };

    // Warn about paths that don't start with /.
    const allPaths = [
      ...restrictions.disallowedPaths,
      ...restrictions.requireHumanApproval,
      ...restrictions.readOnlyPaths,
    ];
    for (const path of allPaths) {
      if (!path.startsWith('/')) {
        warnings.push({
          section: 'restrictions',
          message: `Path pattern "${path}" does not start with "/". Path patterns should be absolute paths.`,
        });
      }
    }

    return restrictions;
  }

  /**
   * Parses the Agent Identification section.
   * Returns permissive defaults if the section is absent.
   */
  private parseAgentIdentification(
    data: SectionData | undefined,
    warnings: ParseWarning[],
  ): AgentIdentification {
    const defaults: AgentIdentification = {
      requireAgentHeader: false,
      requireDisclosure: false,
    };

    if (!data) return defaults;

    const result: AgentIdentification = { ...defaults };

    const rawRequireHeader = data.get('require-agent-header');
    if (rawRequireHeader !== undefined) {
      const value = this.parseBooleanValue(
        rawRequireHeader,
        'agent identification',
        'require-agent-header',
        warnings,
      );
      if (value !== undefined) result.requireAgentHeader = value;
    }

    const headerName = data.get('agent-header-name');
    if (headerName) result.agentHeaderName = headerName;

    const rawRequireDisclosure = data.get('require-disclosure');
    if (rawRequireDisclosure !== undefined) {
      const value = this.parseBooleanValue(
        rawRequireDisclosure,
        'agent identification',
        'require-disclosure',
        warnings,
      );
      if (value !== undefined) result.requireDisclosure = value;
    }

    return result;
  }
}
