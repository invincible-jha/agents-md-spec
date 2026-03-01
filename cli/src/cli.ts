// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 MuVeraAI Corporation

/**
 * agents-md CLI — create, validate, lint, and inspect AGENTS.md files.
 *
 * Commands:
 *   agents-md init [directory]    Create a template AGENTS.md
 *   agents-md validate [path]     Validate against the specification
 *   agents-md lint [path]         Lint for best practices
 *   agents-md info [path]         Display a summary of the file
 */

import { Command } from 'commander';
import { initFile, DEFAULT_INIT_OPTIONS, type InitOptions } from './init.js';
import { validateFile } from './validate.js';
import { lintFile } from './lint.js';
import { infoFile } from './info.js';
import { TRUST_LEVEL_NAMES } from './parser.js';

const program = new Command();

program
  .name('agents-md')
  .description('CLI tool for creating and validating AGENTS.md files (AGENTS-MD-SPEC-001)')
  .version('0.1.0');

// ---------------------------------------------------------------------------
// init command
// ---------------------------------------------------------------------------

program
  .command('init [directory]')
  .description('Create a template AGENTS.md in the specified directory (default: current directory)')
  .option('--site <domain>', 'Domain name for the site (e.g., example.com)')
  .option('--contact <email>', 'Contact email for AI policy inquiries')
  .option(
    '--trust-level <level>',
    'Minimum trust level (0-5). 0=Anonymous, 1=Identified, 2=Verified, 3=Authorized, 4=Privileged, 5=Administrative',
    '0',
  )
  .option(
    '--auth <mode>',
    'Authentication requirement: required | optional | none',
    'none',
  )
  .option('--allow-api', 'Allow API access actions', false)
  .option('--allow-forms', 'Allow form submission actions', false)
  .option(
    '--data-collection <level>',
    'Personal data collection level: none | minimal | standard | extensive',
    'minimal',
  )
  .option(
    '--data-retention <policy>',
    'Data retention: none | session-only | 30-days | 1-year | indefinite',
    'session-only',
  )
  .option('--rpm <number>', 'Requests per minute rate limit', '30')
  .option('--rph <number>', 'Requests per hour rate limit', '500')
  .option('--overwrite', 'Overwrite an existing AGENTS.md file', false)
  .action(
    (
      directory: string | undefined,
      opts: {
        site?: string;
        contact?: string;
        trustLevel: string;
        auth: string;
        allowApi: boolean;
        allowForms: boolean;
        dataCollection: string;
        dataRetention: string;
        rpm: string;
        rph: string;
        overwrite: boolean;
      },
    ) => {
      const targetDirectory = directory ?? '.';

      const trustLevelNumber = parseInt(opts.trustLevel, 10);
      if (isNaN(trustLevelNumber) || trustLevelNumber < 0 || trustLevelNumber > 5) {
        console.error(
          `Error: --trust-level must be an integer from 0 to 5. Got: "${opts.trustLevel}"`,
        );
        process.exit(1);
      }

      const validAuthValues = ['required', 'optional', 'none'];
      if (!validAuthValues.includes(opts.auth)) {
        console.error(
          `Error: --auth must be one of: required, optional, none. Got: "${opts.auth}"`,
        );
        process.exit(1);
      }

      const validCollectionValues = ['none', 'minimal', 'standard', 'extensive'];
      if (!validCollectionValues.includes(opts.dataCollection)) {
        console.error(
          `Error: --data-collection must be one of: none, minimal, standard, extensive. Got: "${opts.dataCollection}"`,
        );
        process.exit(1);
      }

      const validRetentionValues = ['none', 'session-only', '30-days', '1-year', 'indefinite'];
      if (!validRetentionValues.includes(opts.dataRetention)) {
        console.error(
          `Error: --data-retention must be one of: none, session-only, 30-days, 1-year, indefinite. Got: "${opts.dataRetention}"`,
        );
        process.exit(1);
      }

      const options: InitOptions = {
        ...DEFAULT_INIT_OPTIONS,
        siteName: opts.site ?? DEFAULT_INIT_OPTIONS.siteName,
        contact: opts.contact,
        trustLevel: trustLevelNumber,
        authentication: opts.auth as 'required' | 'optional' | 'none',
        allowReadContent: true,
        allowApiAccess: opts.allowApi,
        allowFormSubmit: opts.allowForms,
        personalDataCollection: opts.dataCollection as InitOptions['personalDataCollection'],
        dataRetention: opts.dataRetention as InitOptions['dataRetention'],
        requestsPerMinute: parseInt(opts.rpm, 10) || undefined,
        requestsPerHour: parseInt(opts.rph, 10) || undefined,
      };

      const result = initFile(targetDirectory, options, opts.overwrite);

      if (result.alreadyExisted && !opts.overwrite) {
        console.error(
          `AGENTS.md already exists at: ${result.outputPath}`,
        );
        console.error('Use --overwrite to replace the existing file.');
        process.exit(1);
      }

      if (result.alreadyExisted) {
        console.log(`Overwrote existing AGENTS.md at: ${result.outputPath}`);
      } else {
        console.log(`Created AGENTS.md at: ${result.outputPath}`);
      }

      console.log('');
      console.log('Next steps:');
      console.log('  1. Open AGENTS.md and fill in your site details');
      console.log('  2. Run "agents-md validate AGENTS.md" to check for errors');
      console.log('  3. Run "agents-md lint AGENTS.md" to check best practices');
    },
  );

// ---------------------------------------------------------------------------
// validate command
// ---------------------------------------------------------------------------

program
  .command('validate [path]')
  .description('Validate an AGENTS.md file against the specification (AGENTS-MD-SPEC-001)')
  .option('--json', 'Output results as JSON', false)
  .action((filePath: string | undefined, opts: { json: boolean }) => {
    const targetPath = filePath ?? 'AGENTS.md';
    const result = validateFile(targetPath);

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.valid ? 0 : 1);
      return;
    }

    console.log(`Validating: ${result.filePath}`);
    console.log('');

    if (result.findings.length === 0) {
      console.log('No issues found. File is valid per AGENTS-MD-SPEC-001.');
    } else {
      for (const finding of result.findings) {
        const location = finding.lineNumber ? ` (line ${finding.lineNumber})` : '';
        const prefix = finding.severity === 'error' ? 'ERROR' : 'WARN';
        console.log(`  [${prefix}] [${finding.section}${location}] ${finding.message}`);
      }
    }

    console.log('');
    console.log(
      `Results: ${result.errorCount} error(s), ${result.warningCount} warning(s)`,
    );

    if (result.valid) {
      console.log('Status: VALID');
    } else {
      console.log('Status: INVALID');
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// lint command
// ---------------------------------------------------------------------------

program
  .command('lint [path]')
  .description('Lint an AGENTS.md file for best practices')
  .option('--json', 'Output results as JSON', false)
  .option('--info', 'Include informational messages in output', false)
  .action((filePath: string | undefined, opts: { json: boolean; info: boolean }) => {
    const targetPath = filePath ?? 'AGENTS.md';
    const result = lintFile(targetPath);

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.passed ? 0 : 1);
      return;
    }

    console.log(`Linting: ${result.filePath}`);
    console.log('');

    const displayFindings = opts.info
      ? result.findings
      : result.findings.filter((f) => f.severity !== 'info');

    if (displayFindings.length === 0) {
      if (result.findings.length > 0) {
        console.log('No warnings or errors. (Some informational messages suppressed.)');
      } else {
        console.log('No issues found. File follows all best practices.');
      }
    } else {
      for (const finding of displayFindings) {
        const location = finding.lineNumber ? ` (line ${finding.lineNumber})` : '';
        const severityLabel =
          finding.severity === 'error'
            ? 'ERROR'
            : finding.severity === 'warning'
              ? 'WARN'
              : 'INFO';
        console.log(
          `  [${severityLabel}] [${finding.section}${location}] ${finding.message}`,
        );
      }
    }

    console.log('');
    console.log(
      `Results: ${result.errorCount} error(s), ${result.warningCount} warning(s), ${result.infoCount} info`,
    );

    if (result.passed) {
      console.log('Status: PASS');
    } else {
      console.log('Status: FAIL');
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// info command
// ---------------------------------------------------------------------------

program
  .command('info [path]')
  .description('Display a summary of an AGENTS.md file')
  .option('--json', 'Output results as JSON', false)
  .action((filePath: string | undefined, opts: { json: boolean }) => {
    const targetPath = filePath ?? 'AGENTS.md';
    const result = infoFile(targetPath);

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (!result.found) {
      console.error(`File not found: ${result.filePath}`);
      process.exit(1);
      return;
    }

    console.log(`AGENTS.md Summary`);
    console.log(`=================`);
    console.log(`File: ${result.filePath}`);
    console.log('');

    // Identity
    console.log('Identity');
    console.log(`  Site:          ${result.site ?? '(not set)'}`);
    console.log(`  Contact:       ${result.contact ?? '(not set)'}`);
    console.log(`  Last Updated:  ${result.lastUpdated ?? '(not set)'}`);
    console.log(`  Spec Version:  ${result.specVersion ?? '(not set)'}`);
    console.log('');

    // Trust
    const trustLabel =
      result.minimumTrustLevel !== undefined
        ? `${result.minimumTrustLevel} (${result.trustLevelName ?? 'Unknown'})`
        : '0 (Anonymous — default)';
    console.log('Trust Requirements');
    console.log(`  Minimum Trust: ${trustLabel}`);
    console.log(`  Note: Trust level is a static declaration. Changes are manual only.`);
    console.log(`  Authentication: ${result.authentication ?? 'none (default)'}`);
    console.log('');

    // Actions
    console.log('Allowed Actions');
    if (result.allowedActions.length > 0) {
      console.log(`  Allowed: ${result.allowedActions.join(', ')}`);
    } else {
      console.log(`  Allowed: (none explicitly declared)`);
    }
    if (result.deniedActions.length > 0) {
      console.log(`  Denied:  ${result.deniedActions.join(', ')}`);
    }
    console.log('');

    // Rate Limits
    console.log('Rate Limits');
    const rpmLabel =
      result.requestsPerMinute !== undefined
        ? result.requestsPerMinute === 0
          ? 'unlimited'
          : `${result.requestsPerMinute}/min`
        : '(not declared)';
    const rphLabel =
      result.requestsPerHour !== undefined
        ? result.requestsPerHour === 0
          ? 'unlimited'
          : `${result.requestsPerHour}/hr`
        : '(not declared)';
    const concurrentLabel =
      result.concurrentSessions !== undefined
        ? `${result.concurrentSessions}`
        : '(not declared)';
    console.log(`  Requests/min:   ${rpmLabel}`);
    console.log(`  Requests/hour:  ${rphLabel}`);
    console.log(`  Concurrent:     ${concurrentLabel}`);
    console.log('');

    // Data Handling
    console.log('Data Handling');
    console.log(`  Personal Data:    ${result.personalDataCollection ?? '(not declared)'}`);
    console.log(`  Retention:        ${result.dataRetention ?? '(not declared)'}`);
    console.log(`  Third-party:      ${result.thirdPartySharing ?? '(not declared)'}`);
    console.log('');

    // Restrictions
    console.log('Restrictions');
    console.log(`  Disallowed paths:        ${result.disallowedPathCount}`);
    console.log(`  Approval-required paths: ${result.approvalRequiredPathCount}`);
    console.log(`  Read-only paths:         ${result.readOnlyPathCount}`);
    console.log('');

    // Agent Identification
    console.log('Agent Identification');
    console.log(
      `  Require header:    ${result.requireAgentHeader !== undefined ? String(result.requireAgentHeader) : 'false (default)'}`,
    );
    console.log(
      `  Require disclosure: ${result.requireDisclosure !== undefined ? String(result.requireDisclosure) : 'false (default)'}`,
    );
    console.log('');

    // Summary counts
    console.log('Structure');
    console.log(`  Total sections:  ${result.sectionCount}`);
    console.log(`  Known sections:  ${result.knownSectionCount} / 7`);
    console.log(`  Total directives: ${result.totalDirectiveCount}`);

    // Print all trust level names as reference (informational only)
    console.log('');
    console.log('Trust Level Reference (generic 0-5 scale)');
    for (const [levelStr, name] of Object.entries(TRUST_LEVEL_NAMES)) {
      const marker = String(result.minimumTrustLevel) === levelStr ? ' <-- current minimum' : '';
      console.log(`  ${levelStr} = ${name}${marker}`);
    }
  });

program.parse(process.argv);
