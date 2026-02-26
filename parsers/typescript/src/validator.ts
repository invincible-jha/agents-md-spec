// SPDX-License-Identifier: MIT
// Copyright (c) 2026 MuVeraAI Corporation

import type { AgentsPolicy, ValidationResult } from './types.js';

/**
 * Validates a parsed AgentsPolicy object for semantic correctness.
 *
 * This function checks that all fields are within their valid ranges
 * and that required fields are present. It does not re-parse the file;
 * it operates on already-parsed data.
 *
 * @param policy - The AgentsPolicy to validate.
 * @returns A ValidationResult containing a boolean and a list of error messages.
 *
 * @example
 * ```typescript
 * const parser = new AgentsMdParser();
 * const parseResult = parser.parse(content);
 * if (parseResult.policy) {
 *   const validation = validate(parseResult.policy);
 *   if (!validation.valid) {
 *     console.error(validation.errors);
 *   }
 * }
 * ```
 */
export function validate(policy: AgentsPolicy): ValidationResult {
  const errors: string[] = [];

  // --- Identity section validation ---
  if (!policy.identity) {
    errors.push('Identity section is missing.');
  } else {
    if (!policy.identity.site || policy.identity.site.trim().length === 0) {
      errors.push('Identity.site is required and must not be empty.');
    } else {
      // Basic domain format check — must not contain protocol or path.
      if (policy.identity.site.includes('://')) {
        errors.push(
          `Identity.site "${policy.identity.site}" must be a domain name only (without protocol, e.g., "example.com").`,
        );
      }
      if (policy.identity.site.includes(' ')) {
        errors.push(
          `Identity.site "${policy.identity.site}" must not contain spaces.`,
        );
      }
    }

    if (policy.identity.lastUpdated !== undefined) {
      const isoDatePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;
      if (!isoDatePattern.test(policy.identity.lastUpdated)) {
        errors.push(
          `Identity.lastUpdated "${policy.identity.lastUpdated}" is not a valid ISO 8601 date.`,
        );
      }
    }
  }

  // --- Trust requirements validation ---
  if (policy.trustRequirements) {
    const level = policy.trustRequirements.minimumTrustLevel;
    if (!Number.isInteger(level) || level < 0 || level > 5) {
      errors.push(
        `TrustRequirements.minimumTrustLevel must be an integer between 0 and 5. Got: ${level}.`,
      );
    }

    const validAuthValues = ['required', 'optional', 'none'];
    if (!validAuthValues.includes(policy.trustRequirements.authentication)) {
      errors.push(
        `TrustRequirements.authentication must be one of: ${validAuthValues.join(', ')}. Got: "${policy.trustRequirements.authentication}".`,
      );
    }

    if (policy.trustRequirements.authenticationMethods !== undefined) {
      if (!Array.isArray(policy.trustRequirements.authenticationMethods)) {
        errors.push('TrustRequirements.authenticationMethods must be an array.');
      } else {
        for (const method of policy.trustRequirements.authenticationMethods) {
          if (typeof method !== 'string' || method.trim().length === 0) {
            errors.push(
              'TrustRequirements.authenticationMethods must contain non-empty strings.',
            );
            break;
          }
        }
      }
    }
  }

  // --- Rate limits validation ---
  if (policy.rateLimits) {
    const rateLimitFields: Array<keyof typeof policy.rateLimits> = [
      'requestsPerMinute',
      'requestsPerHour',
      'concurrentSessions',
    ];

    for (const field of rateLimitFields) {
      const value = policy.rateLimits[field];
      if (value !== undefined) {
        if (!Number.isInteger(value) || value < 0) {
          errors.push(
            `RateLimits.${field} must be a non-negative integer. Got: ${value}.`,
          );
        }
      }
    }
  }

  // --- Data handling validation ---
  if (policy.dataHandling) {
    const validCollection = ['none', 'minimal', 'standard', 'extensive'];
    if (
      policy.dataHandling.personalDataCollection !== undefined &&
      !validCollection.includes(policy.dataHandling.personalDataCollection)
    ) {
      errors.push(
        `DataHandling.personalDataCollection must be one of: ${validCollection.join(', ')}.`,
      );
    }

    const validRetention = ['none', 'session-only', '30-days', '1-year', 'indefinite'];
    if (
      policy.dataHandling.dataRetention !== undefined &&
      !validRetention.includes(policy.dataHandling.dataRetention)
    ) {
      errors.push(
        `DataHandling.dataRetention must be one of: ${validRetention.join(', ')}.`,
      );
    }

    const validSharing = ['none', 'anonymized', 'with-consent', 'unrestricted'];
    if (
      policy.dataHandling.thirdPartySharing !== undefined &&
      !validSharing.includes(policy.dataHandling.thirdPartySharing)
    ) {
      errors.push(
        `DataHandling.thirdPartySharing must be one of: ${validSharing.join(', ')}.`,
      );
    }

    if (
      policy.dataHandling.gdprCompliance !== undefined &&
      typeof policy.dataHandling.gdprCompliance !== 'boolean'
    ) {
      errors.push('DataHandling.gdprCompliance must be a boolean.');
    }
  }

  // --- Restrictions validation ---
  if (policy.restrictions) {
    const pathArrayFields: Array<keyof typeof policy.restrictions> = [
      'disallowedPaths',
      'requireHumanApproval',
      'readOnlyPaths',
    ];

    for (const field of pathArrayFields) {
      const paths = policy.restrictions[field];
      if (!Array.isArray(paths)) {
        errors.push(`Restrictions.${field} must be an array.`);
        continue;
      }

      for (const path of paths) {
        if (typeof path !== 'string') {
          errors.push(`Restrictions.${field} must contain strings.`);
          break;
        }
        if (!path.startsWith('/')) {
          errors.push(
            `Restrictions.${field} path "${path}" must start with "/".`,
          );
        }
      }
    }
  }

  // --- Agent identification validation ---
  if (policy.agentIdentification) {
    if (typeof policy.agentIdentification.requireAgentHeader !== 'boolean') {
      errors.push('AgentIdentification.requireAgentHeader must be a boolean.');
    }
    if (typeof policy.agentIdentification.requireDisclosure !== 'boolean') {
      errors.push('AgentIdentification.requireDisclosure must be a boolean.');
    }
    if (
      policy.agentIdentification.agentHeaderName !== undefined &&
      (typeof policy.agentIdentification.agentHeaderName !== 'string' ||
        policy.agentIdentification.agentHeaderName.trim().length === 0)
    ) {
      errors.push(
        'AgentIdentification.agentHeaderName must be a non-empty string if specified.',
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
