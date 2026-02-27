// SPDX-License-Identifier: MIT
// Copyright (c) 2026 MuVeraAI Corporation

/**
 * AGENTS.md VS Code Extension — Entry Point
 *
 * Provides IntelliSense, structural diagnostics, hover documentation,
 * and section-header completions for AGENTS.md policy files.
 *
 * Spec: AGENTS-MD-SPEC-001 (https://github.com/aumos-oss/agents-md-spec)
 * Zero external dependencies — all types from the `vscode` module only.
 */

import * as vscode from "vscode";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Required top-level heading in every AGENTS.md file. */
const REQUIRED_TOP_HEADING = "# AGENTS.md";

/** Sections required by AGENTS-MD-SPEC-001. */
const REQUIRED_SECTIONS: readonly string[] = [
  "## Identity",
];

/** All well-known section names defined in AGENTS-MD-SPEC-001. */
const KNOWN_SECTIONS: readonly string[] = [
  "## Identity",
  "## Trust Requirements",
  "## Allowed Actions",
  "## Rate Limits",
  "## Data Handling",
  "## Restrictions",
  "## Agent Identification",
];

/**
 * Trust level descriptions for the generic 0-5 scale.
 * Values: 0=Anonymous, 1=Identified, 2=Verified, 3=Authorized,
 *         4=Privileged, 5=Administrative.
 */
const TRUST_LEVEL_DESCRIPTIONS: Readonly<Record<number, string>> = {
  0: "**Anonymous (0)** — No authentication or identity verification required. Any agent may interact.",
  1: "**Identified (1)** — The agent must provide a stable identifier (e.g. an agent header or API key), but identity is not cryptographically verified.",
  2: "**Verified (2)** — The agent's identity must be verified (e.g. OAuth token, signed credential). Recommended minimum for write operations.",
  3: "**Authorized (3)** — The agent must hold explicit authorization for this resource or action. Used for delegation and handoff scenarios.",
  4: "**Privileged (4)** — Elevated access for trusted service accounts or platform operators. Restricted to a small, known set of callers.",
  5: "**Administrative (5)** — Full administrative access. Reserved for platform administrators. Agents at this level can perform destructive operations.",
};

/** Well-known key names within each AGENTS.md section. */
const SECTION_KEY_DOCS: Readonly<Record<string, string>> = {
  "site": "The domain name of the web property (without protocol). e.g. `example.com`",
  "contact": "Email address for AI policy inquiries. e.g. `ai-policy@example.com`",
  "last-updated": "ISO 8601 date when this policy was last updated. e.g. `2026-02-26`",
  "spec-version": "AGENTS-MD-SPEC version this file targets. e.g. `1.0.0`",
  "minimum-trust-level": "Minimum trust level (0–5) required to interact. 0=Anonymous … 5=Administrative.",
  "authentication": "Whether authentication is required. Values: `required`, `optional`, `none`.",
  "authentication-methods": "Comma-separated list of accepted auth methods. e.g. `oauth2, api-key, bearer`",
  "read-content": "May the agent read page content? `true` or `false`. Default: `true`.",
  "submit-forms": "May the agent submit HTML forms? `true` or `false`. Default: `false`.",
  "make-purchases": "May the agent initiate purchases? `true` or `false`. Default: `false`.",
  "modify-account": "May the agent change account settings? `true` or `false`. Default: `false`.",
  "access-api": "May the agent call documented API endpoints? `true` or `false`. Default: `false`.",
  "download-files": "May the agent download files? `true` or `false`. Default: `false`.",
  "upload-files": "May the agent upload files? `true` or `false`. Default: `false`.",
  "send-messages": "May the agent send messages on behalf of a user? `true` or `false`. Default: `false`.",
  "delete-data": "May the agent delete data? `true` or `false`. Default: `false`.",
  "create-content": "May the agent create content? `true` or `false`. Default: `false`.",
  "requests-per-minute": "Maximum requests per minute the operator asks agents to observe.",
  "requests-per-hour": "Maximum requests per hour the operator asks agents to observe.",
  "concurrent-sessions": "Maximum number of concurrent agent sessions.",
  "personal-data-collection": "Level of personal data collected. Values: `none`, `minimal`, `standard`, `extensive`.",
  "data-retention": "How long interaction data is retained. Values: `none`, `session-only`, `30-days`, `1-year`, `indefinite`.",
  "third-party-sharing": "Third-party data sharing policy. Values: `none`, `anonymized`, `with-consent`, `unrestricted`.",
  "gdpr-compliance": "Whether the site operates in GDPR compliance. `true` or `false`.",
  "disallowed-paths": "Comma-separated glob patterns agents MUST NOT access. e.g. `/admin/*, /internal/**`",
  "require-human-approval": "Comma-separated paths requiring human confirmation before agent action.",
  "read-only-paths": "Comma-separated paths where only read operations are permitted.",
  "require-agent-header": "Must the agent send an identifying HTTP header? `true` or `false`.",
  "agent-header-name": "HTTP header name for agent identification. Default: `X-Agent-Identity`.",
  "require-disclosure": "Must the agent disclose its AI nature to users? `true` or `false`.",
};

// ---------------------------------------------------------------------------
// File matching
// ---------------------------------------------------------------------------

/** Returns true if the given document is an AGENTS.md or agents.md file. */
function isAgentsMdFile(document: vscode.TextDocument): boolean {
  const filename = document.fileName.replace(/\\/g, "/").split("/").pop() ?? "";
  return filename === "AGENTS.md" || filename === "agents.md";
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/**
 * Analyze an AGENTS.md document and return structural diagnostics.
 *
 * Checks performed:
 * 1. File must begin with `# AGENTS.md` heading.
 * 2. Required sections must be present.
 * 3. Unknown section names (not in KNOWN_SECTIONS, not `x-` prefixed) are warned.
 * 4. `minimum-trust-level` values outside 0–5 are flagged as errors.
 */
function analyzeDocument(document: vscode.TextDocument): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const lines = document.getText().split(/\r?\n/);

  const hasTopHeading = lines.some(
    (line) => line.trim() === REQUIRED_TOP_HEADING
  );
  if (!hasTopHeading) {
    const range = new vscode.Range(0, 0, 0, lines[0]?.length ?? 0);
    diagnostics.push(
      new vscode.Diagnostic(
        range,
        `AGENTS.md must begin with '${REQUIRED_TOP_HEADING}' as the first heading (AGENTS-MD-SPEC-001 §4.3).`,
        vscode.DiagnosticSeverity.Error
      )
    );
  }

  const foundSections = new Set<string>();
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex] ?? "";
    const trimmed = line.trim();

    // Collect section headings
    if (trimmed.startsWith("## ")) {
      foundSections.add(trimmed);

      // Warn on unknown sections (not in spec, not x- prefixed)
      const isKnown = KNOWN_SECTIONS.includes(trimmed);
      const isExtension = trimmed.startsWith("## x-") || trimmed.startsWith("## X-");
      if (!isKnown && !isExtension) {
        const range = new vscode.Range(lineIndex, 0, lineIndex, line.length);
        diagnostics.push(
          new vscode.Diagnostic(
            range,
            `Unknown section '${trimmed}'. Known sections: ${KNOWN_SECTIONS.join(", ")}. ` +
              `Custom sections should be prefixed with 'x-' (e.g. '## x-my-section').`,
            vscode.DiagnosticSeverity.Warning
          )
        );
      }
    }

    // Validate minimum-trust-level values
    const trustLevelMatch = trimmed.match(/^-\s*minimum-trust-level:\s*(\S+)/i);
    if (trustLevelMatch !== null) {
      const rawValue = trustLevelMatch[1] ?? "";
      const numericValue = parseInt(rawValue, 10);
      if (isNaN(numericValue) || numericValue < 0 || numericValue > 5) {
        const range = new vscode.Range(lineIndex, 0, lineIndex, line.length);
        diagnostics.push(
          new vscode.Diagnostic(
            range,
            `Invalid trust level '${rawValue}'. Must be an integer from 0 (Anonymous) to 5 (Administrative).`,
            vscode.DiagnosticSeverity.Error
          )
        );
      }
    }

    // Validate boolean values for known boolean keys
    const booleanKeyMatch = trimmed.match(
      /^-\s*(read-content|submit-forms|make-purchases|modify-account|access-api|download-files|upload-files|send-messages|delete-data|create-content|require-agent-header|require-disclosure|gdpr-compliance):\s*(\S+)/i
    );
    if (booleanKeyMatch !== null) {
      const rawBoolean = (booleanKeyMatch[2] ?? "").toLowerCase();
      if (rawBoolean !== "true" && rawBoolean !== "false") {
        const range = new vscode.Range(lineIndex, 0, lineIndex, line.length);
        diagnostics.push(
          new vscode.Diagnostic(
            range,
            `Value '${booleanKeyMatch[2]}' is not a valid boolean. Use 'true' or 'false'.`,
            vscode.DiagnosticSeverity.Error
          )
        );
      }
    }

    // Validate authentication enum values
    const authMatch = trimmed.match(/^-\s*authentication:\s*(\S+)/i);
    if (authMatch !== null) {
      const rawAuth = (authMatch[1] ?? "").toLowerCase();
      if (rawAuth !== "required" && rawAuth !== "optional" && rawAuth !== "none") {
        const range = new vscode.Range(lineIndex, 0, lineIndex, line.length);
        diagnostics.push(
          new vscode.Diagnostic(
            range,
            `Invalid authentication value '${authMatch[1]}'. Must be 'required', 'optional', or 'none'.`,
            vscode.DiagnosticSeverity.Error
          )
        );
      }
    }
  }

  // Check required sections are present
  for (const requiredSection of REQUIRED_SECTIONS) {
    if (!foundSections.has(requiredSection)) {
      const range = new vscode.Range(0, 0, 0, 0);
      diagnostics.push(
        new vscode.Diagnostic(
          range,
          `Required section '${requiredSection}' is missing (AGENTS-MD-SPEC-001 §5).`,
          vscode.DiagnosticSeverity.Error
        )
      );
    }
  }

  return diagnostics;
}

// ---------------------------------------------------------------------------
// Hover Provider
// ---------------------------------------------------------------------------

/**
 * Provides hover documentation for:
 * - Section headings (## SectionName): shows section purpose.
 * - Key lines (- key: value): shows key documentation.
 * - Trust level numeric values: shows trust level description.
 */
class AgentsMdHoverProvider implements vscode.HoverProvider {
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Hover | null {
    if (!isAgentsMdFile(document)) {
      return null;
    }

    const line = document.lineAt(position.line).text.trim();

    // Hover on trust level numeric value
    const trustLevelMatch = line.match(/^-\s*minimum-trust-level:\s*(\d+)/i);
    if (trustLevelMatch !== null) {
      const level = parseInt(trustLevelMatch[1] ?? "0", 10);
      const description = TRUST_LEVEL_DESCRIPTIONS[level];
      if (description !== undefined) {
        return new vscode.Hover(
          new vscode.MarkdownString(description),
          document.lineAt(position.line).range
        );
      }
    }

    // Hover on a key-value directive line
    const keyMatch = line.match(/^-\s*([\w-]+)\s*:/i);
    if (keyMatch !== null) {
      const key = (keyMatch[1] ?? "").toLowerCase();
      const doc = SECTION_KEY_DOCS[key];
      if (doc !== undefined) {
        return new vscode.Hover(
          new vscode.MarkdownString(`**\`${key}\`**\n\n${doc}`),
          document.lineAt(position.line).range
        );
      }
    }

    // Hover on a section heading
    if (line.startsWith("## ")) {
      const sectionName = line.slice(3).trim();
      const sectionDocs: Readonly<Record<string, string>> = {
        "Identity": "**Identity** (required) — Declares the site domain, contact email, and policy metadata. The `site` key is required.",
        "Trust Requirements": "**Trust Requirements** — Declares the minimum trust level (0–5) and authentication method required for agents to interact.",
        "Allowed Actions": "**Allowed Actions** — Declares which action categories agents may perform. All keys default to `false` except `read-content` which defaults to `true`.",
        "Rate Limits": "**Rate Limits** — Declares the rate limits operators request agents to observe. These are advisory, not enforced by the spec.",
        "Data Handling": "**Data Handling** — Declares the operator's data handling commitments for agent interactions.",
        "Restrictions": "**Restrictions** — Declares path-level restrictions. Use glob patterns for `disallowed-paths`, `require-human-approval`, and `read-only-paths`.",
        "Agent Identification": "**Agent Identification** — Declares whether agents must send an identifying header and disclose their AI nature.",
      };
      const sectionDoc = sectionDocs[sectionName];
      if (sectionDoc !== undefined) {
        return new vscode.Hover(
          new vscode.MarkdownString(sectionDoc),
          document.lineAt(position.line).range
        );
      }
    }

    return null;
  }
}

// ---------------------------------------------------------------------------
// Completion Provider
// ---------------------------------------------------------------------------

/**
 * Provides section header completions when the user types `##` at the start
 * of a line in an AGENTS.md file.
 */
class AgentsMdCompletionProvider implements vscode.CompletionItemProvider {
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | null {
    if (!isAgentsMdFile(document)) {
      return null;
    }

    const linePrefix = document.lineAt(position.line).text.slice(0, position.character);
    if (!linePrefix.trimStart().startsWith("##")) {
      return null;
    }

    return KNOWN_SECTIONS.map((section) => {
      const item = new vscode.CompletionItem(
        section,
        vscode.CompletionItemKind.Keyword
      );
      item.detail = "AGENTS.md section (AGENTS-MD-SPEC-001)";
      item.insertText = section;
      return item;
    });
  }
}

// ---------------------------------------------------------------------------
// Document Link Provider
// ---------------------------------------------------------------------------

/**
 * Provides document links for the spec-version directive so developers can
 * navigate to the specification document from within their AGENTS.md file.
 */
class AgentsMdDocumentLinkProvider implements vscode.DocumentLinkProvider {
  public provideDocumentLinks(
    document: vscode.TextDocument
  ): vscode.DocumentLink[] {
    if (!isAgentsMdFile(document)) {
      return [];
    }

    const links: vscode.DocumentLink[] = [];
    const lines = document.getText().split(/\r?\n/);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex] ?? "";
      const trimmed = line.trim();
      const specVersionMatch = trimmed.match(/^-\s*spec-version:\s*(\d+\.\d+\.\d+)/i);
      if (specVersionMatch !== null) {
        const version = specVersionMatch[1] ?? "1.0.0";
        // Link the spec-version value to the spec document on GitHub
        const valueStart = line.indexOf(version);
        if (valueStart !== -1) {
          const range = new vscode.Range(
            lineIndex,
            valueStart,
            lineIndex,
            valueStart + version.length
          );
          const target = vscode.Uri.parse(
            `https://github.com/aumos-oss/agents-md-spec/blob/main/spec/AGENTS-MD-SPEC-001.md`
          );
          links.push(new vscode.DocumentLink(range, target));
        }
      }
    }

    return links;
  }
}

// ---------------------------------------------------------------------------
// Extension lifecycle
// ---------------------------------------------------------------------------

/** Diagnostic collection for AGENTS.md files. */
let diagnosticCollection: vscode.DiagnosticCollection | undefined;

/**
 * Called when the extension is activated.
 * Registers all providers and sets up document change listeners.
 */
export function activate(context: vscode.ExtensionContext): void {
  diagnosticCollection = vscode.languages.createDiagnosticCollection("agents-md");
  context.subscriptions.push(diagnosticCollection);

  const config = vscode.workspace.getConfiguration("agentsMd");

  // Diagnostic provider (triggered on open and on change)
  const updateDiagnostics = (document: vscode.TextDocument): void => {
    if (!isAgentsMdFile(document)) {
      return;
    }
    if (config.get<boolean>("enableDiagnostics", true)) {
      const diagnostics = analyzeDocument(document);
      diagnosticCollection?.set(document.uri, diagnostics);
    }
  };

  // Run diagnostics on all currently open AGENTS.md files
  vscode.workspace.textDocuments.forEach(updateDiagnostics);

  // Run diagnostics when a document is opened
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(updateDiagnostics)
  );

  // Run diagnostics when a document is changed
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      updateDiagnostics(event.document);
    })
  );

  // Clear diagnostics when a document is closed
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      diagnosticCollection?.delete(document.uri);
    })
  );

  // Hover provider
  if (config.get<boolean>("enableHover", true)) {
    context.subscriptions.push(
      vscode.languages.registerHoverProvider(
        { pattern: "**/{AGENTS,agents}.md" },
        new AgentsMdHoverProvider()
      )
    );
  }

  // Completion provider
  if (config.get<boolean>("enableCompletions", true)) {
    context.subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
        { pattern: "**/{AGENTS,agents}.md" },
        new AgentsMdCompletionProvider(),
        "#" // Trigger character
      )
    );
  }

  // Document link provider (always active)
  context.subscriptions.push(
    vscode.languages.registerDocumentLinkProvider(
      { pattern: "**/{AGENTS,agents}.md" },
      new AgentsMdDocumentLinkProvider()
    )
  );

  // Command: validate current file
  context.subscriptions.push(
    vscode.commands.registerCommand("agentsMd.validateFile", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor === undefined) {
        void vscode.window.showWarningMessage("No active editor.");
        return;
      }
      if (!isAgentsMdFile(editor.document)) {
        void vscode.window.showWarningMessage(
          "Active file is not an AGENTS.md file."
        );
        return;
      }
      updateDiagnostics(editor.document);
      void vscode.window.showInformationMessage(
        "AGENTS.md validation complete. See Problems panel for results."
      );
    })
  );

  // Command: show trust level reference
  context.subscriptions.push(
    vscode.commands.registerCommand("agentsMd.showTrustLevels", () => {
      const lines = Object.entries(TRUST_LEVEL_DESCRIPTIONS).map(
        ([level, description]) => `${level}: ${description}`
      );
      void vscode.window.showInformationMessage(
        `Trust Levels:\n${lines.join("\n")}`,
        { modal: true }
      );
    })
  );
}

/**
 * Called when the extension is deactivated.
 * Cleans up the diagnostic collection.
 */
export function deactivate(): void {
  diagnosticCollection?.clear();
  diagnosticCollection?.dispose();
  diagnosticCollection = undefined;
}
