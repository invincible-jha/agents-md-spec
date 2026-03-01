// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 MuVeraAI Corporation

/**
 * Minimal self-contained AGENTS.md parser for the CLI.
 *
 * This parser is intentionally separate from the parsers/typescript package
 * so the CLI has zero cross-package dependencies and can be published standalone.
 * It implements the AGENTS-MD-SPEC-001 parsing rules in full.
 */

/** A single key-value directive extracted from a section. */
export interface Directive {
  readonly key: string;
  readonly value: string;
}

/** A named section extracted from an AGENTS.md file. */
export interface Section {
  readonly name: string;
  readonly rawName: string;
  readonly directives: readonly Directive[];
  /** 1-based line number of the section heading. */
  readonly lineNumber: number;
}

/** The result of a raw structural parse — sections and their directives. */
export interface RawParseResult {
  readonly sections: readonly Section[];
  readonly hasTitleHeading: boolean;
}

/** A validation/lint finding with location context. */
export interface Finding {
  readonly severity: 'error' | 'warning' | 'info';
  readonly section: string;
  readonly message: string;
  /** 1-based line number, if applicable. */
  readonly lineNumber?: number;
}

/** Trust level names on the generic 0-5 scale. */
export const TRUST_LEVEL_NAMES: Record<number, string> = {
  0: 'Anonymous',
  1: 'Identified',
  2: 'Verified',
  3: 'Authorized',
  4: 'Privileged',
  5: 'Administrative',
};

/**
 * Performs a raw structural parse of an AGENTS.md file.
 * Extracts sections and directives without semantic interpretation.
 *
 * @param content - The raw UTF-8 string content of the file.
 * @returns The raw parse result with all sections and their directives.
 */
export function parseRaw(content: string): RawParseResult {
  const lines = content.split(/\r?\n/);
  const sections: Section[] = [];
  let hasTitleHeading = false;

  let currentSectionName: string | null = null;
  let currentSectionRawName: string | null = null;
  let currentSectionLine = 0;
  let currentDirectives: Directive[] = [];

  const flushSection = (): void => {
    if (currentSectionName !== null && currentSectionRawName !== null) {
      sections.push({
        name: currentSectionName,
        rawName: currentSectionRawName,
        directives: currentDirectives,
        lineNumber: currentSectionLine,
      });
      currentDirectives = [];
    }
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? '';
    const lineNumber = index + 1;

    // Check for the title heading: # AGENTS.md
    if (/^#\s+AGENTS\.md\s*$/i.test(line)) {
      hasTitleHeading = true;
      continue;
    }

    // Check for section headings: ## SectionName
    const sectionMatch = line.match(/^##\s+(.+)$/);
    if (sectionMatch) {
      flushSection();
      const rawName = sectionMatch[1]?.trim() ?? '';
      currentSectionRawName = rawName;
      currentSectionName = rawName.toLowerCase();
      currentSectionLine = lineNumber;
      currentDirectives = [];
      continue;
    }

    // Within a section, extract directive lines: - key: value
    if (currentSectionName !== null) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      if (!trimmed.startsWith('- ')) continue;

      const withoutBullet = trimmed.slice(2);
      const colonIndex = withoutBullet.indexOf(':');
      if (colonIndex === -1) continue;

      const key = withoutBullet.slice(0, colonIndex).trim().toLowerCase();
      const value = withoutBullet.slice(colonIndex + 1).trim();

      if (key.length > 0) {
        currentDirectives.push({ key, value });
      }
    }
  }

  flushSection();

  return { sections, hasTitleHeading };
}

/**
 * Looks up a directive value from a section by key (case-insensitive key lookup).
 *
 * @param section - The section to search.
 * @param key - The directive key to find (will be compared lowercase).
 * @returns The directive value, or undefined if not found.
 */
export function getDirective(section: Section, key: string): string | undefined {
  const normalizedKey = key.toLowerCase();
  return section.directives.find((directive) => directive.key === normalizedKey)?.value;
}

/**
 * Finds a section by its normalized name.
 *
 * @param sections - The array of sections to search.
 * @param name - The section name to find (compared lowercase).
 * @returns The matching section, or undefined.
 */
export function findSection(sections: readonly Section[], name: string): Section | undefined {
  const normalizedName = name.toLowerCase();
  return sections.find((section) => section.name === normalizedName);
}

/**
 * Parses a comma-separated string into a trimmed, non-empty array of strings.
 */
export function parseArray(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Parses a boolean value from a directive string.
 * Returns undefined for unrecognized values.
 */
export function parseBoolean(raw: string): boolean | undefined {
  const normalized = raw.toLowerCase().trim();
  if (['true', 'yes', '1', 'on'].includes(normalized)) return true;
  if (['false', 'no', '0', 'off'].includes(normalized)) return false;
  return undefined;
}

/**
 * Parses a positive integer from a directive string.
 * Returns undefined for non-integer values.
 */
export function parseInteger(raw: string): number | undefined {
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed) || parsed.toString() !== raw.trim()) return undefined;
  return parsed;
}

/** Standard action keys defined by AGENTS-MD-SPEC-001, section 8. */
export const STANDARD_ACTION_KEYS: readonly string[] = [
  'read-content',
  'submit-forms',
  'make-purchases',
  'modify-account',
  'access-api',
  'download-files',
  'upload-files',
  'send-messages',
  'delete-data',
  'create-content',
];

/** Required sections per the specification. */
export const REQUIRED_SECTIONS: readonly string[] = ['identity'];

/** Recommended sections per the specification. */
export const RECOMMENDED_SECTIONS: readonly string[] = ['trust requirements'];

/** All known section names. */
export const KNOWN_SECTIONS: readonly string[] = [
  'identity',
  'trust requirements',
  'allowed actions',
  'rate limits',
  'data handling',
  'restrictions',
  'agent identification',
];
