# Stage 5 Run A — Shared Life-History and Participation Foundation

Status: COMPLETED 2026-08-23

## Goal and Boundary

Implement the bounded shared foundation that Run B and Run C can consume: canonical organization-linked education enrollment, non-work organization participation, separate child authority, typed sequence-aware life evidence for Stage 4 reasoning, a legacy `PersonFact` compatibility boundary, and an injectable eligibility consumer seam.

This run does not implement playable formative or adult paths, education or career progression content, resources, housing, relationship maintenance, the generalized event engine, mutable law, territory-specific content, or player-facing UI.

## Authority and Research Gate

- [x] Verify starting HEAD `1a025a81d09b88c24404f1e067915909d33cdfe1`, the clean worktree, and absence of later project commits.
- [x] Read `AGENTS.md`, the Game Constitution, accepted decisions D-031 through D-037, architecture and integrity contracts, roadmap/dependency/spec/acceptance documents, completed Stage 5.1 plan, affected system documents, and relevant simulation/persistence code and tests.
- [x] Treat the implementation constraints supplied in the Run A brief as the approved research gate; perform no redundant broad web research.
- [x] Confirm that the prior Stage 5.1 audit explicitly deferred education/organization identity and guardianship while preserving the legacy biography availability boundary.

## Architecture to Implement

- [x] Add stable education-enrollment roots and append-only effective state history linked to `Person` and `Organization`, with open program/context keys and closed expected/active/completed/withdrawn/transferred/ended behavior.
- [x] Add stable non-work organization participation roots and append-only state/role history with open participation/context keys. Reuse independent `LifeCommitmentRecord` entries for any meaningful time demand rather than adding scheduling fields.
- [x] Add stable child-authority roots whose holder is a typed person-or-organization reference, plus append-only active/ended basis history. Do not infer kinship, care, household, or partnership.
- [x] Add historical/as-of query helpers using effective date plus exclusive global sequence, including stable shared-school context.
- [x] Add a closed typed life-record reference union and resolver so Stage 4 perceptions, appraisals, provenance, decisions, and frozen source snapshots can use canonical Stage 5 evidence without routing it through `PersonFact`.
- [x] Preserve `PersonFact` identities and nondiegetic progressive materialization unchanged; document canonical-life-first precedence and legacy summary/fallback behavior.
- [x] Add a pure typed eligibility request/result/provider seam with open action and reason keys, stable jurisdiction references, and no embedded age or law table.
- [x] Advance world/generator/snapshot versions consistently because required history families change, while retaining same-version deterministic JSON and Node-only SQLite behavior.

## Semantic Acceptance

- [x] Prove independent grandparent care/household/kinship versus parent authority.
- [x] Prove relative-guardian authority without fabricated relationship types.
- [x] Prove agency authority with separate caregiver care and co-residence.
- [x] Prove school transfer and rename history through stable organization identity and date/sequence queries.
- [x] Prove teacher/former-student shared-school continuity and later work/relationship composition.
- [x] Prove school debate plus separate youth-group participation without employment and preserve the work boundary for genuine volunteer service.
- [x] Prove later-appended backdated Run A history cannot leak into an earlier sequence cutoff.
- [x] Prove unrelated NPC materialization appends no history and perturbs no deterministic state.
- [x] Prove legacy facts round-trip unchanged and cannot override canonical education/work/life truth.
- [x] Prove deterministic JSON and Node-only SQLite preserve all new records and typed source references exactly.
- [x] Prove unanticipated valid taxonomy keys pass while malformed keys fail.
- [x] Prove injected eligibility providers return allowed and blocked structured decisions without a universal age rule.
- [x] Prove typed life sources obey actor ownership, date, and exclusive sequence in perception, appraisal provenance, and decision evidence.
- [x] Prove canonical constructors create no duplicate `PersonFact` or unrelated structural relationship.

## Audit and Validation

- [x] Re-run retroactive audit dispositions for `PersonFact` availability, progressive materialization, organization identity, relationship separation, global sequence, subjective sources, open taxonomies, persistence versions, future mutable rules, jurisdiction/territory openness, and Stage 6/7 leakage.
- [x] Update architecture, roadmap, dependencies, acceptance tests, decision log, and affected system documents to agree with implemented behavior.
- [x] Run format, lint, typecheck, all tests, build, deterministic demo, deterministic JSON/SQLite checks, boundary checks, `git diff --check`, and the available npm security audit.
- [x] Recheck the unchanged tree, move this plan to completed, create the one clean Run A checkpoint, and stop before Run B.

## Completion Record

- Completed on 2026-08-23 as Run A of Stage 5; Stage 5 remains **IN PROGRESS** and Run B has not started.
- Starting HEAD was `1a025a81d09b88c24404f1e067915909d33cdfe1` on clean `main`, with no later project commits and no configured remote. The intended single Run A checkpoint message is `Implement Stage 5 Run A shared life-history foundation`.
- `npm run validate` passed: Prettier, ESLint, TypeScript, 14 Vitest files / 127 tests, the production Vite build, and the deterministic headless demo all succeeded.
- The demo reported `reproducible: true`, world `world_8f4441bfbc1ae07b`, snapshot `snapshot_fc530c8f7517c082`, six people, eleven events, one organization, two work relationships, two households, and one care responsibility for `validation-seed`.
- The 15 focused scenarios in `stage-5-run-a.test.ts` prove structural authority separation, stable enrollment/transfer/rename and shared-school continuity, participation/work/time boundaries, expected and backdated behavior, nondiegetic materialization, legacy-fact precedence, open taxonomies and jurisdictions, eligibility injection, typed life evidence in perception/appraisal/decisions, exact JSON persistence, duplicate-truth prevention, and corruption rejection.
- The Run A SQLite scenario proves save/load/list/replace with a changed snapshot while preserving every new family and typed source exactly. Existing boundary and replay tests verify the Node-only simulation, contiguous global history, deterministic JSON, and absence of React/DOM/browser/SQLite imports from production simulation.
- `git diff --check` passed. The ordinary online `npm audit --audit-level=high` attempt could not reach `registry.npmjs.org` from the sandbox, and the escalation could not start because the Codex app approval token was revoked. The materially safer `npm audit --offline --audit-level=high` completed with zero vulnerabilities; dependency manifests were unchanged in this run.
- World schema is 7, generator is `demo-world-v7`, snapshot format is 6, and person materialization remains version 4. Unsupported older saves are still rejected; no migration or fabricated `PersonFact` sequence was added.
- The Architecture Integrity Audit records the contained retroactive corrections and confirms no Run B/C gameplay, Stage 6 event engine, Stage 7 law/territory content, organization hierarchy, or player-facing UI was implemented.
- Re-authentication restored the approved Git checkpoint path; the final commit and clean status are reported outside this self-referential commit record.
