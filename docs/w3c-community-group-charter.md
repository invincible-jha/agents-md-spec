<!-- SPDX-License-Identifier: CC-BY-SA-4.0 -->
<!-- Copyright (c) 2026 MuVeraAI Corporation -->

# Agent Manifest Community Group Charter

**W3C Community Group Proposal**
**Proposed Group Name:** Agent Manifest Community Group
**Short Name:** `agentmanifest`
**Proposed W3C URI:** `https://www.w3.org/community/agentmanifest/`
**Charter Version:** 1.0.0
**Date:** 2026-02-26
**Status:** Proposed
**License:** [W3C Community Contributor License Agreement (CLA)](https://www.w3.org/community/about/agreements/cla/) (code); [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) (specification)

---

## Table of Contents

1. [Background and Motivation](#1-background-and-motivation)
2. [Group Mission and Scope](#2-group-mission-and-scope)
3. [Why the Web Needs a Standardized Agent Manifest](#3-why-the-web-needs-a-standardized-agent-manifest)
4. [Use Cases](#4-use-cases)
5. [Deliverables](#5-deliverables)
6. [Timeline](#6-timeline)
7. [Participation](#7-participation)
8. [Governance and Decision Making](#8-governance-and-decision-making)
9. [Licensing](#9-licensing)
10. [Relationship to Other Standards and Groups](#10-relationship-to-other-standards-and-groups)
11. [Success Criteria](#11-success-criteria)

---

## 1. Background and Motivation

The web was built for humans. Its conventions — `robots.txt` for crawlers, `sitemap.xml` for discovery, `humans.txt` for attribution — emerged organically to address the needs of each new class of automated actor. Each convention succeeded because it was simple, machine-readable, and human-understandable without tooling.

We are now entering the age of autonomous AI agents: software systems that do not merely read web pages but navigate, authenticate, submit forms, execute purchases, and modify data on behalf of users. These agents differ fundamentally from web crawlers in their capabilities and potential impact. Yet no standard exists for a web property to declare its interaction policies for these actors.

**AGENTS.md** is the proposed answer: a plain-text Markdown file, placed at the root of a web property, that declares what AI agents are permitted to do. Think of it as `robots.txt` for AI agents — a convention simple enough to adopt without tooling, expressive enough to cover the full range of agent behaviors, and open enough to become a true web-wide standard.

This Community Group proposes to take the AGENTS.md format — initially developed under the [aumos-oss/agents-md-spec](https://github.com/aumos-oss/agents-md-spec) open-source repository — into the W3C Community Group process to build consensus, gather broad implementer input, and work toward a formal W3C Report or Note.

---

## 2. Group Mission and Scope

### 2.1 Mission Statement

The Agent Manifest Community Group develops and maintains open, vendor-neutral specifications for a machine-readable file format — `AGENTS.md` / `agents.md` — that allows web property operators to declare their policies for autonomous AI agent interactions.

### 2.2 In Scope

The following topics are in scope for this Community Group:

- The `AGENTS.md` file format: syntax, encoding, section definitions, key-value schema
- The agent policy model: permission declarations, trust level conventions, rate limit expressions, data handling commitments, path-based restrictions, and agent identification requirements
- File discovery and caching rules: how agents locate and cache the manifest
- Security considerations: HTTPS requirements, redirect handling, spoofing resistance
- JSON Schema for `AGENTS.md` machine validation
- Conformance criteria for both operators (publishers) and agents (consumers)
- A conformance test suite to verify parser implementations
- Reference parser implementations (TypeScript/JavaScript, Python) licensed under MIT
- Extensions: the `x-` prefix convention for vendor and site-specific extensions
- Use cases and deployment guidance for operators

### 2.3 Out of Scope

The following topics are explicitly out of scope:

- Enforcement mechanisms: this specification is advisory, not enforceable at the protocol level
- Agent capability description: AGENTS.md declares what agents MAY do, not what they CAN do (that is OpenAPI's domain)
- Crawl policies: `robots.txt` handles these and AGENTS.md does not overlap with or replace `robots.txt`
- Passive LLM content accessibility: `llms.txt` handles this; AGENTS.md addresses interactive agent behavior
- Proprietary trust systems or behavioral scoring algorithms
- Any mechanism for automatically changing declared policy based on agent behavior

---

## 3. Why the Web Needs a Standardized Agent Manifest

### 3.1 The Gap

Every major category of automated web actor has acquired a corresponding web convention:

| Actor | Convention | Year |
|---|---|---|
| Web crawlers | `robots.txt` | 1994 |
| Search engines | `sitemap.xml` | 2005 |
| LLM content retrieval | `llms.txt` | 2024 |
| **Autonomous AI agents** | **`agents.md` (proposed)** | **2026** |

Autonomous AI agents represent a qualitatively different class of actor from crawlers or passive LLM data sources. They can:

- Authenticate with user credentials
- Submit forms, including financial transactions
- Modify account data
- Send messages on behalf of users
- Delete or create content

In the absence of a machine-readable policy standard, site operators have no structured way to communicate intent to AI agents. The resulting situation is one of ambiguity at best, and potential harm at worst:

- Agents that act in good faith may inadvertently violate operator intent because no intent was declared
- Operators who wish to permit agent interactions have no standard vocabulary for communicating permissions
- Operators who wish to restrict agent interactions cannot do so through any channel agents are expected to check

### 3.2 Why a W3C Community Group

The web standards ecosystem has demonstrated, repeatedly, that conventions that begin as informal proposals benefit enormously from the W3C Community Group process:

- Broader implementer participation ensures edge cases are discovered before the format hardens
- The W3C IP policy (Community Contributor License Agreement) provides a royalty-free licensing framework that encourages adoption without legal friction
- A W3C affiliation provides the format with the kind of institutional credibility that drives adoption among enterprises and regulated industries
- The multi-stakeholder governance model prevents any single vendor from capturing the standard

The goal of this Community Group is not to produce a W3C Recommendation immediately. The immediate goal is to produce a stable, consensus-built specification and conformance test suite that could be submitted as a W3C Note or Report, with the longer-term possibility of progression through the full W3C standards track if adoption warrants it.

### 3.3 The Robots.txt Analogy

`robots.txt` succeeded because it was:

1. Simple enough to write by hand
2. Hosted at a predictable location
3. Machine-readable without special libraries
4. Not legally binding but widely honored by cooperating actors

AGENTS.md follows the same design philosophy. It is Markdown with a structured `- key: value` syntax that any developer can read and write without tooling, parseable by a library in under 500 lines, hosted at a predictable URL, and advisory rather than enforceable. The parallel is deliberate and is the central positioning of this work: **AGENTS.md is `robots.txt` for AI agents**.

---

## 4. Use Cases

The following use cases motivate the scope and design of the AGENTS.md specification.

### 4.1 Public Blog with Read-Only Agent Access

A blogger wants AI assistants to be able to read and summarize their content, but does not want agents to take any actions (submit contact forms, click affiliate links on their behalf, etc.). They publish an AGENTS.md declaring `read-content: true` and all action flags as `false`, with no authentication required.

### 4.2 E-Commerce Site with Guarded Purchase Flow

An e-commerce operator wants AI shopping assistants to browse their catalog and add items to a cart, but requires explicit human approval before any purchase is completed. They declare `make-purchases: false` and `require-human-approval: /checkout/*`. Agents that read this manifest know to pause at the checkout boundary and prompt the user for confirmation.

### 4.3 SaaS Platform with Authenticated Agent API Access

A SaaS platform wants to explicitly invite AI agents to use their documented API on behalf of authenticated users. They declare `access-api: true`, `authentication: required`, `authentication-methods: oauth2`, and a `minimum-trust-level: 2`. Agents are told both that API access is permitted and what authentication flow to use.

### 4.4 Healthcare Provider with Strict Data Commitments

A healthcare information platform wants to communicate its data handling posture to agents before any interaction occurs. They declare `personal-data-collection: minimal`, `data-retention: session-only`, `third-party-sharing: none`, and `gdpr-compliance: true`. This allows agents configured to respect user privacy preferences to make informed decisions about whether to interact.

### 4.5 Government Services Portal with High Trust Requirements

A government services portal permits only explicitly authorized agents with verified government credentials to interact with citizen-facing services. They declare `minimum-trust-level: 3`, `authentication: required`, and restrict all non-read actions to paths requiring human approval. Agents lacking the required trust level know to decline to act rather than attempt and fail.

### 4.6 Developer Tool Integrating Agent Policy into its UI

An IDE or AI assistant product wants to show users whether the sites they are interacting with have declared agent policies, and to surface those policies in a user-readable form. The tool fetches AGENTS.md from each origin the user visits and displays a permission summary. This use case motivates the requirement that the format be human-readable as well as machine-parseable.

### 4.7 Enterprise with Multiple Subdomains and Varying Policies

A large enterprise runs several web properties: a public marketing site, an authenticated customer portal, and an internal employee portal. They publish separate AGENTS.md files on each subdomain with different policies. The specification's scoping rules (AGENTS.md does not apply across subdomains) support this deployment model.

---

## 5. Deliverables

The Community Group commits to producing the following deliverables during its active phase. All deliverables will be published under open licenses (CC BY-SA 4.0 for specifications, MIT for code).

### 5.1 AGENTS.md Specification (Primary Deliverable)

**Document:** Agent Manifest Specification, Version 1.x
**Target:** W3C Community Group Report

The specification defines:

- File location and discovery algorithm
- File encoding and format (UTF-8 Markdown with structured `- key: value` directives)
- Complete section reference (Identity, Trust Requirements, Allowed Actions, Rate Limits, Data Handling, Restrictions, Agent Identification)
- Parsing rules for all value types (boolean, integer, string, array, glob pattern)
- Trust level definitions (generic 0–5 scale: Anonymous, Identified, Verified, Authorized, Privileged, Administrative)
- Path pattern syntax (glob)
- Caching rules
- Security requirements (HTTPS mandatory, redirect handling, size and timeout limits)
- Agent compliance recommendations
- ABNF grammar for formal reference
- Extension mechanism (`x-` prefix convention)
- Versioning and backwards-compatibility guarantees

The starting point for this specification is `AGENTS-MD-SPEC-001` from the [aumos-oss/agents-md-spec](https://github.com/aumos-oss/agents-md-spec) repository, contributed to the Community Group by MuVeraAI Corporation.

### 5.2 JSON Schema

**Document:** Agent Manifest JSON Schema
**Target:** Published alongside the specification

A JSON Schema (Draft 2020-12) that enables programmatic validation of parsed AGENTS.md content. This schema serves as a machine-checkable contract for parser implementers and enables tooling such as IDEs, linters, and CI pipelines to validate AGENTS.md files.

### 5.3 Conformance Test Suite

**Document:** AGENTS.md Parser Conformance Test Suite
**Target:** W3C Community Group Report or companion document

A structured set of test cases (in a machine-readable format, TBD: JSON or YAML) covering:

- Valid minimal files
- Valid complete files
- All specified section types
- All value types and edge cases
- Malformed inputs that must produce specific errors or warnings
- Extension sections that must be preserved
- Security edge cases (HTTP vs. HTTPS, oversized files, timeout behavior)

Parsers that pass the conformance test suite MAY claim conformance with the specification.

### 5.4 Reference Parser Implementations

**TypeScript/JavaScript reference parser** (npm package: `agents-md`)
**Python reference parser** (PyPI package: `agents-md`)

Both parsers are MIT-licensed reference implementations that:

- Pass the conformance test suite
- Have zero proprietary runtime dependencies
- Include TypeScript strict-mode type definitions
- Are published as open-source under the [aumos-oss/agents-md-spec](https://github.com/aumos-oss/agents-md-spec) repository

These implementations serve as an executable specification and lower the barrier to adoption.

### 5.5 Deployment and Adoption Guidance

Informative documents covering:

- Site operator quickstart guide
- AI agent developer integration guide
- Security considerations in depth
- Common deployment patterns and anti-patterns

---

## 6. Timeline

This timeline is indicative. The Community Group will adjust based on participation levels and feedback volume.

### Phase 1: Formation and Baseline (Months 1–3)

- [ ] Community Group formally established at W3C
- [ ] Contributing members sign W3C Community Contributor License Agreement
- [ ] Transfer of `AGENTS-MD-SPEC-001` draft to Community Group document format
- [ ] Establish mailing list, GitHub repository, and meeting cadence
- [ ] Initial call for implementations and feedback from browser vendors, agent platform developers, and site operators

### Phase 2: Specification Hardening (Months 4–9)

- [ ] Address feedback from Phase 1
- [ ] Finalize section reference (all standard keys defined and frozen)
- [ ] Finalize parsing rules (all edge cases documented)
- [ ] Finalize ABNF grammar
- [ ] Publish JSON Schema 1.0
- [ ] Publish conformance test suite 1.0
- [ ] Reference parsers updated to pass full conformance suite

### Phase 3: Community Report (Months 10–12)

- [ ] Publish AGENTS.md Specification as W3C Community Group Report
- [ ] Solicit implementations report from community
- [ ] Evaluate interest in advancing to W3C Working Group Note or Standards Track
- [ ] Publish adoption guidance documents

### Phase 4: Ongoing Maintenance (Month 13+)

- [ ] Process errata and minor version updates
- [ ] Monitor web adoption and gather operator/agent developer feedback
- [ ] Evaluate whether a W3C Recommendation track Working Group is warranted

---

## 7. Participation

### 7.1 Openness

Participation in the Agent Manifest Community Group is **open to all**. There is no membership requirement, fee, or organizational affiliation required to join. Any individual may join by signing the [W3C Community Contributor License Agreement](https://www.w3.org/community/about/agreements/cla/).

### 7.2 Who Should Participate

The Community Group particularly seeks participation from:

- **AI agent platform developers** — companies building autonomous AI agents or agent frameworks
- **Web property operators** — site owners who wish to declare or refine their agent interaction policies
- **Browser and runtime vendors** — implementers who may integrate AGENTS.md discovery into their platforms
- **Accessibility and privacy advocates** — stakeholders with expertise in how automated access policies interact with user rights
- **Web standards specialists** — individuals with experience in W3C process, HTTP standards, and web conventions

### 7.3 Joining

To join:

1. Create or log into your [W3C account](https://www.w3.org/accounts/request)
2. Navigate to the [Agent Manifest Community Group page](https://www.w3.org/community/agentmanifest/)
3. Click "Join this Group" and sign the CLA

Participation in GitHub discussions, mailing list threads, and specification editing does not require W3C membership.

### 7.4 Meeting Schedule

The Community Group will hold:

- Monthly video calls (60 minutes) for specification discussion and decision-making
- Asynchronous discussion via GitHub issues and the W3C mailing list
- Ad-hoc working sessions as needed for time-sensitive issues

All meetings will be recorded and minutes published. Asynchronous participation is fully supported.

### 7.5 Code of Conduct

Participants are expected to follow the [W3C Code of Ethics and Professional Conduct](https://www.w3.org/Consortium/cepc/).

---

## 8. Governance and Decision Making

### 8.1 Chair

The Community Group will elect one or two Chairs from among its participating members. The Chair is responsible for:

- Facilitating meetings and discussions
- Maintaining the specification editing process
- Managing the GitHub repository and issue tracker
- Coordinating with W3C staff as needed

The initial proposed Chair is a representative from MuVeraAI Corporation (the contributing organization). A co-chair election will be held within three months of formation to bring in a second organization.

### 8.2 Decision Making

The Community Group operates by **rough consensus** as defined by the W3C process. Decisions are made on the mailing list or in video calls, with a minimum notice period of one week for any normative change.

When rough consensus cannot be reached, the Chair may call for a formal vote among members who have signed the CLA. A simple majority of participating members decides.

### 8.3 Specification Editing

The specification is maintained in a public GitHub repository. Normative changes require:

1. A GitHub issue describing the proposed change
2. A pull request implementing the change
3. At least two approvals from Community Group members who are not the PR author
4. A one-week review window with no unresolved objections from CLA-signed members

Editorial changes (fixing typos, improving clarity without changing normative meaning) require only one approval.

### 8.4 Intellectual Property

All contributions to Community Group deliverables are made under the [W3C Community Contributor License Agreement](https://www.w3.org/community/about/agreements/cla/), which grants the Community Group a royalty-free license to the contributor's patent claims that are essential to implementing the specification.

---

## 9. Licensing

### 9.1 Specification

The AGENTS.md Specification and all Community Group Reports are published under [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/).

You are free to:

- **Share** — copy and redistribute the material in any medium or format
- **Adapt** — remix, transform, and build upon the material for any purpose

Under the following terms:

- **Attribution** — You must give appropriate credit to the Agent Manifest Community Group and the W3C
- **ShareAlike** — If you remix, transform, or build upon the material, you must distribute your contributions under the same license

### 9.2 Reference Implementations

All reference parser implementations (TypeScript, Python) produced by or contributed to the Community Group are published under the [MIT License](https://opensource.org/licenses/MIT).

This distinction is intentional: the MIT license for implementations maximizes adoption by removing friction for commercial integrators, while CC BY-SA for the specification ensures the standard itself remains open.

### 9.3 Contributions

Contributions to the specification text are accepted under CC BY-SA 4.0. Contributors retain copyright over their contributions. By contributing, you grant the Community Group the right to publish your contribution under CC BY-SA 4.0.

---

## 10. Relationship to Other Standards and Groups

### 10.1 `robots.txt` (RFC 9309)

`robots.txt` defines a well-established convention for communicating crawl policies to web robots. AGENTS.md is designed to **complement, not replace** `robots.txt`. The two files coexist and address different concerns:

- `robots.txt` addresses whether a robot may fetch a URL
- AGENTS.md addresses what actions an AI agent may perform once it has access

A site operator may wish to publish both. A well-behaved AI agent should check both.

### 10.2 `llms.txt`

`llms.txt` (proposed informally in 2024) is designed to make web content more accessible to large language models during training or retrieval-augmented generation. It is a passive content-accessibility hint. AGENTS.md addresses interactive agent behavior and is complementary.

### 10.3 OpenAPI Specification (OAI)

OpenAPI describes the capabilities of an HTTP API: what endpoints exist, what parameters they accept, and what responses they return. AGENTS.md describes behavioral constraints on an agent: what it is permitted to do, not what it can do. They are complementary and may coexist on the same domain.

### 10.4 W3C Web Application Description Language (WADL)

WADL is an older XML-based API description format, now largely superseded by OpenAPI. The relationship is the same as for OpenAPI above.

### 10.5 W3C Permissions Policy / Feature Policy

W3C Permissions Policy controls which browser features are available to embedded content and cross-origin frames. It operates at the browser level and addresses different actors (scripts, iframes) than AGENTS.md (autonomous AI agents operating outside the browser).

### 10.6 W3C Web of Things (WoT) Thing Description

W3C WoT Thing Descriptions describe IoT device capabilities in a machine-readable format. While there is philosophical similarity (machine-readable capability and policy description), the target domain is different (IoT devices vs. web properties). The Community Group may draw on WoT design patterns.

### 10.7 Relation to W3C AI Ethics and Technical AI Guidelines

The Community Group's work is consistent with W3C's broader interest in responsible AI on the web. The mandatory `robots.txt`-style convention for agent policies is a practical, deployable step toward giving web property operators meaningful control over AI agent interactions on their properties.

---

## 11. Success Criteria

The Community Group considers the following outcomes as measures of success:

### 11.1 Specification Maturity

- AGENTS.md Specification published as a W3C Community Group Report by end of Phase 3
- No unresolved normative issues in the specification
- ABNF grammar validated independently

### 11.2 Implementation Coverage

- At least two independent (non-MuVeraAI) parser implementations that pass the conformance test suite
- At least one major AI agent platform or framework that reads and honors AGENTS.md
- At least one major web platform (CDN, hosting provider, or CMS) that offers AGENTS.md generation tooling

### 11.3 Community Engagement

- At least 20 distinct participating organizations represented in the Community Group
- At least 10 active contributors to the specification text
- Mailing list and GitHub activity sustained throughout Phase 2 and Phase 3

### 11.4 Adoption Signal

- AGENTS.md files deployed on at least 1,000 public web properties by the time the Community Group Report is published
- Inclusion of AGENTS.md in at least one web standards or developer ecosystem guide (MDN, web.dev, or similar)

---

## Appendix A: Initial Contribution

The following materials are contributed to the Community Group by MuVeraAI Corporation as its initial input:

| Resource | Location | License |
|---|---|---|
| AGENTS.md Specification Draft | `spec/AGENTS-MD-SPEC-001.md` | CC BY-SA 4.0 |
| JSON Schema | `spec/agents.schema.json` | CC BY-SA 4.0 |
| TypeScript Reference Parser | `parsers/typescript/` | MIT |
| Python Reference Parser | `parsers/python/` | MIT |
| Operator Adoption Guide | `docs/adoption-guide.md` | CC BY-SA 4.0 |
| Agent Developer Guide | `docs/for-agent-developers.md` | CC BY-SA 4.0 |

All materials are available at [https://github.com/aumos-oss/agents-md-spec](https://github.com/aumos-oss/agents-md-spec).

---

## Appendix B: Contact

For questions about this charter or the Community Group proposal:

- **GitHub:** [https://github.com/aumos-oss/agents-md-spec/issues](https://github.com/aumos-oss/agents-md-spec/issues)
- **Proposing Organization:** MuVeraAI Corporation
- **W3C Community Group Submission:** Via [https://www.w3.org/community/groups/proposed/](https://www.w3.org/community/groups/proposed/)

---

*This charter is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Copyright (c) 2026 MuVeraAI Corporation.*
