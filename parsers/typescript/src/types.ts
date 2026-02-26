// SPDX-License-Identifier: MIT
// Copyright (c) 2026 MuVeraAI Corporation

/**
 * Identity section — declares the web property's identity and contact.
 * This section is REQUIRED in a valid AGENTS.md file.
 */
export interface IdentitySection {
  /** The domain name of the web property (without protocol). */
  site: string;
  /** Email address for AI policy inquiries. */
  contact?: string;
  /** ISO 8601 date when the policy was last updated. */
  lastUpdated?: string;
  /** Version of AGENTS-MD-SPEC this file targets. */
  specVersion?: string;
}

/**
 * Trust requirements — declares minimum trust level and authentication requirements.
 * Uses a generic 0-5 numeric scale; 0 = anonymous, 5 = administrative.
 */
export interface TrustRequirements {
  /**
   * Minimum trust level required on a 0-5 generic scale.
   * 0 = Anonymous, 1 = Identified, 2 = Verified,
   * 3 = Authorized, 4 = Privileged, 5 = Administrative.
   * @default 0
   */
  minimumTrustLevel: number;
  /**
   * Whether authentication is required, optional, or not needed.
   * @default "none"
   */
  authentication: 'required' | 'optional' | 'none';
  /** Comma-separated list of accepted authentication methods, parsed into an array. */
  authenticationMethods?: string[];
}

/**
 * Rate limits — declares the rate limits agents are expected to observe.
 * All values must be positive integers. 0 means unlimited.
 */
export interface RateLimits {
  /** Maximum requests per minute. */
  requestsPerMinute?: number;
  /** Maximum requests per hour. */
  requestsPerHour?: number;
  /** Maximum number of concurrent sessions. */
  concurrentSessions?: number;
}

/**
 * Data handling — declares the operator's data handling commitments.
 */
export interface DataHandling {
  /** Level of personal data collected from agent interactions. */
  personalDataCollection: 'none' | 'minimal' | 'standard' | 'extensive';
  /** How long interaction data is retained. */
  dataRetention: 'none' | 'session-only' | '30-days' | '1-year' | 'indefinite';
  /** Whether and how interaction data is shared with third parties. */
  thirdPartySharing: 'none' | 'anonymized' | 'with-consent' | 'unrestricted';
  /** Whether the site operates in compliance with GDPR. */
  gdprCompliance: boolean;
}

/**
 * Restrictions — path-level restrictions on agent access.
 * Paths support simplified glob patterns (e.g., /admin/*, /docs/**).
 */
export interface Restrictions {
  /** Paths agents MUST NOT access. */
  disallowedPaths: string[];
  /** Paths requiring explicit human approval before agent action. */
  requireHumanApproval: string[];
  /** Paths where only read operations are permitted. */
  readOnlyPaths: string[];
}

/**
 * Agent identification — requirements for agent self-identification.
 */
export interface AgentIdentification {
  /**
   * Whether the agent must send an identifying HTTP header.
   * @default false
   */
  requireAgentHeader: boolean;
  /**
   * The HTTP header name to use for agent identification.
   * @default "X-Agent-Identity"
   */
  agentHeaderName?: string;
  /**
   * Whether the agent must disclose its AI nature to users.
   * @default false
   */
  requireDisclosure: boolean;
}

/**
 * The complete parsed AGENTS.md policy.
 * Only the `identity` field is guaranteed to be present in a valid policy.
 */
export interface AgentsPolicy {
  /** Identity section — always present in a valid policy. */
  identity: IdentitySection;
  /** Trust requirements. Defaults applied when section is absent. */
  trustRequirements: TrustRequirements;
  /**
   * Allowed actions map.
   * Keys use camelCase versions of the markdown keys (e.g., readContent, submitForms).
   */
  allowedActions: Record<string, boolean>;
  /** Rate limits. Fields are absent when not specified. */
  rateLimits: RateLimits;
  /**
   * Data handling commitments.
   * Fields are present only if declared in the file.
   */
  dataHandling: Partial<DataHandling>;
  /** Path-level restrictions. Arrays are empty when not specified. */
  restrictions: Restrictions;
  /** Agent identification requirements. Defaults applied when section is absent. */
  agentIdentification: AgentIdentification;
}

/**
 * A parse error indicates a structural problem that prevents the policy
 * from being considered valid (e.g., missing required Identity section).
 */
export interface ParseError {
  /** Line number where the error occurred, if applicable. */
  line?: number;
  /** The section name where the error occurred. */
  section: string;
  /** Human-readable error message. */
  message: string;
}

/**
 * A parse warning indicates a recoverable issue (e.g., unknown boolean value,
 * unrecognized key in a known section). The parser continues and uses defaults.
 */
export interface ParseWarning {
  /** The section name where the warning occurred. */
  section: string;
  /** Human-readable warning message. */
  message: string;
}

/**
 * The result of parsing an AGENTS.md file.
 * When `success` is true, `policy` is guaranteed to be present.
 * When `success` is false, `errors` will contain at least one entry.
 */
export interface ParseResult {
  /** Whether the parse produced a usable policy. */
  success: boolean;
  /** The parsed policy. Present when `success` is true. */
  policy?: AgentsPolicy;
  /** Errors that caused parsing to fail or produce an invalid result. */
  errors: ParseError[];
  /** Warnings about recoverable issues encountered during parsing. */
  warnings: ParseWarning[];
}

/**
 * The result of validating an AgentsPolicy object.
 */
export interface ValidationResult {
  /** Whether the policy passed all validation checks. */
  valid: boolean;
  /** Human-readable descriptions of validation failures. */
  errors: string[];
}
