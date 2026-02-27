<!-- SPDX-License-Identifier: CC-BY-SA-4.0 -->
<!-- Copyright (c) 2026 MuVeraAI Corporation -->

# AGENTS.md Registry

The AGENTS.md Registry is a public, community-maintained directory of agents and
services that publish an `AGENTS.md` policy file at a known URL. It serves as a
discovery layer — a curated list that lets orchestrators, developers, and operators
find agents that declare their capabilities and trust requirements according to the
[AGENTS-MD-SPEC-001](../spec/AGENTS-MD-SPEC-001.md) standard.

---

## What the Registry Is

The registry is a directory of JSON files — one per entry — located in
`registry/entries/`. Each file conforms to [`registry/schema.json`](./schema.json).
An entry records:

- **`name`** — Human-readable agent or service name.
- **`url`** — Public HTTPS URL where the AGENTS.md file is hosted.
- **`trust_level`** — The minimum trust level the agent declares (0–5 generic scale).
- **`capabilities`** — Free-form tags describing what the agent can do.
- **`verified`** — Set by CI after automated validation (do not set manually).
- **`added_at`** — Date the entry was added.
- **`maintainer`** — Contact information for the entry owner.

The registry does **not** host AGENTS.md files. It only records their locations.
The authoritative policy is always the file served at the declared URL.

---

## Trust Level Reference

| Level | Name | Meaning |
|---|---|---|
| 0 | Anonymous | No authentication required |
| 1 | Identified | Caller must provide an identifier |
| 2 | Verified | Caller must pass identity verification |
| 3 | Authorized | Caller must hold explicit authorization |
| 4 | Privileged | Elevated access; restricted callers only |
| 5 | Administrative | Full administrative access |

---

## How to Submit an Entry

1. Fork this repository on GitHub.
2. Create a new file at `registry/entries/<your-agent-slug>.json`.
3. Fill in the fields according to [`registry/schema.json`](./schema.json).
   - `name`, `url`, and `trust_level` are required.
   - Set `verified` to `false` — the CI pipeline sets it after validation.
   - Set `added_at` to today's date in `YYYY-MM-DD` format.
4. Validate your entry locally:
   ```bash
   npx ajv validate -s registry/schema.json -d registry/entries/<your-slug>.json
   ```
5. Open a pull request against the `main` branch.
   - PR title: `registry: add <agent name>`
   - The CI pipeline will fetch your declared URL, parse the AGENTS.md file,
     and validate that the declared `trust_level` matches the parsed
     `minimum-trust-level` field.
6. Once CI passes and a maintainer approves, your entry is merged and
   `verified` is set to `true` automatically by the merge workflow.

### Example Entry File

```json
{
  "name": "Acme Research Assistant",
  "url": "https://research.acme.com/AGENTS.md",
  "trust_level": 2,
  "capabilities": ["search", "summarization", "question-answering"],
  "verified": false,
  "added_at": "2026-02-26",
  "maintainer": {
    "name": "Acme AI Team",
    "github": "acme-ai",
    "email": "ai-policy@acme.com"
  },
  "description": "Research assistant with web search and document summarization.",
  "framework": "langchain",
  "spec_version": "1.0.0"
}
```

---

## Verification Process

When a PR is opened to add or update a registry entry, the registry CI workflow runs:

1. **Schema validation** — The entry JSON must pass `ajv validate` against
   `registry/schema.json`. Failures block the PR.
2. **URL reachability** — The declared `url` must respond with HTTP 200 over HTTPS.
   Redirects are followed once. Failures block the PR.
3. **AGENTS.md parsing** — The response body is parsed using the reference
   [TypeScript parser](../parsers/typescript/) from this repository.
   Invalid AGENTS.md syntax blocks the PR.
4. **Trust level consistency** — The `trust_level` field in the registry entry must
   match the `minimum-trust-level` parsed from the live AGENTS.md file.
   Mismatches block the PR.
5. **On merge** — The merge workflow sets `verified: true` and commits the update
   automatically. The entry is then included in the next registry snapshot.

Verification is re-run weekly on all existing entries. If a previously-verified
entry's URL becomes unreachable or inconsistent, `verified` is set back to `false`
and the maintainer is notified via a GitHub issue.

---

## Discovery Use Cases

### For orchestrators and agent networks

An orchestrator can load the registry snapshot to discover available agents without
hardcoding URLs. Filter by `trust_level`, `capabilities`, or `framework`:

```javascript
const registry = await fetch(
  "https://agents-md.org/registry/snapshot.json"
).then((r) => r.json());

const searchAgents = registry.filter(
  (entry) =>
    entry.verified &&
    entry.trust_level <= 2 &&
    entry.capabilities.includes("search")
);
```

### For developers building agent networks

Use the registry to find agents that expose compatible trust levels before
hard-wiring an integration:

```bash
# Find all verified agents with trust_level 0 (open/anonymous access)
jq '[.[] | select(.verified == true and .trust_level == 0)]' registry/snapshot.json
```

### For operators evaluating agent deployments

Check whether a proposed agent integration has a published policy before allowing
it to act on your behalf. If the agent's domain appears in the registry and
`verified` is `true`, its policy was validated against the spec at submission time.

---

## Registry Governance

- The registry is community-maintained under CC BY-SA 4.0.
- Entries may be removed if the declared URL becomes permanently unavailable
  (returns 404 for 30+ consecutive days) or if the AGENTS.md content violates
  the specification.
- Maintainers retain ownership of their entries and may update them via PR.
- The registry does not endorse or certify the agents listed — it only records
  that their policy files are reachable and spec-compliant at the time of verification.

---

## License

Registry entry files and schema: CC BY-SA 4.0.
See [../LICENSE](../LICENSE) for the full license text.
