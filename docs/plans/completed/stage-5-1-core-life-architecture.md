# Stage 5.1 Core Life Architecture

Status: COMPLETED 2026-08-22

## Goal and Boundary

Implement the first bounded Stage 5 run: stable organizations; actual work relationships and role history; temporal households and co-residence; separate kinship, partnership, and care concepts; ranged time demands; and a deterministic load/recovery mechanism that reuses Stage 4 temporary states.

This is not all of Stage 5. Formative-age content and play (5.2), adult education/career content and progression (5.3), and finance, housing, and relationship-maintenance gameplay (5.4) remain deferred.

## Approved Research and Governance Gate

- [x] Read the repository authority hierarchy, completed Stage 4 plan, relevant Stage 1–4 simulation/persistence/tests, Git history, and the approved Stage 5.1 brief.
- [x] Treat the supplied household, care, time-use, labour, real-career, and comparable-game research as reviewed and approved; do not restart a broad research project or turn illustrative categories into engine ontology.
- [x] Record the bounded research-gated implementation-run process in the decision log.
- [x] Inspect the Stage 4 belief-option wording. Correct the confirmed conviction/flexibility wording in a separate checkpoint before Stage 5.1.
- [x] Run the permanent Architecture Integrity Audit over affected Stage 1–4 concepts before choosing migrations.

## Research Classification

### Implement now

- Stable, provenance-bearing organization identity with effective-dated name/classification/location profiles and open classification keys.
- Stable actual work relationships, independent role/occupation history, temporary inactivity, multiple concurrent roles, and semantically typed authority/dependency/risk/compensation dimensions.
- Stable households distinct from family and dwellings; temporal locations and memberships, including valid multi-residence.
- Separate effective-dated kinship, partnership, and care foundations; care may cross households and be shared.
- Ranged time-demand profiles with attention, concurrency, rigidity, interruptibility, and optional location constraint.
- Qualitative deterministic load, short-term push, sustained-overload, and recovery consequences through the existing temporary-state system.
- Date-and-sequence historical queries, graph/chronology validation, deterministic JSON/SQLite persistence, and semantic proof fixtures.

### Retroactive corrections or migrations

- Restrict future `FamilyRelationshipFact` content to kinship/family summary vocabulary; partnership and care move to their own canonical Stage 5.1 records.
- Preserve `OccupationFact` as immutable biography/expertise summary, not the canonical job ontology. Stable work relationships become canonical for detailed work history.
- Preserve `ResidenceFact` as immutable geographic biography summary, not household identity or a dwelling. Household membership/location becomes canonical for co-residence.
- Prefer stable shared-organization/work histories in coworker queries while retaining the Stage 2 relationship-interaction evidence path and a documented legacy biography fallback.
- Keep the existing biography append-availability restriction explicit. New Stage 5.1 records are sequence-aware; this run does not silently fabricate availability metadata for old facts.

### Bank for Stage 5.2–5.4

- Formative-age event/content generation, school/teacher/club/sport mechanics, adult education and career-content catalogs, apprenticeship and military gameplay, paid childcare, finance/resource flows, housing/property, relationship maintenance/decay, and custody law or calendars.
- Bulk occupation/organization datasets and jurisdiction-specific ethics or outside-employment rules.
- Player scheduling UI, hourly calendars, life-management screens, and player-facing meters.

### Reject for this architecture

- One current-career or household field on `Person`; family-as-household; employee booleans; exhaustive prompt-derived organization/work/care enums; arbitrary metadata bags; 168-hour subtraction; universal life/productivity/family/fatigue scores; and named-real-person special cases.

### Questions requiring user decision

- None. The approved brief fixes the stage boundary, semantic distinctions, migration discipline, research basis, and UI exclusion sufficiently to proceed.

## Architectural Risks and Audit Dispositions

- **Text employers and overwritten occupation:** supersede as detailed work truth with stable relationships, roles, and organization IDs; preserve old facts only as summaries/expertise evidence.
- **Family concept mixing:** correct future vocabulary and add distinct partnership/care records; do not infer co-residence from kinship.
- **Household versus dwelling:** keep household identity independent and express movement through dated jurisdiction/location records.
- **Concurrent time double-counting:** derive exclusive-equivalent pressure from explicit concurrency and attention semantics rather than subtracting every expected hour.
- **Parallel fatigue system:** reject; load resolution must append ordinary Stage 4 temporary-state context.
- **Backfilled future leakage:** every new entity/state record participates in the global append sequence and every as-of query applies date plus exclusive sequence.
- **Open-set erosion:** organization, occupation, work, kinship, partnership, care, membership, and commitment content use validated semantic namespaces; finite lifecycle and demand dimensions remain closed with documented behavior.

## Implementation

- [x] Add stable life entities and append-oriented record families with deterministic IDs, canonical ordering, provenance, and immutable inputs.
- [x] Add organization profile history and lightweight progressive-detail extension seam.
- [x] Add work relationship, role, status, occupation classification, and time-demand histories.
- [x] Add household location and membership histories with multi-residence validation.
- [x] Add separate kinship, partnership, and care histories.
- [x] Add exceptional life commitments and deterministic life-load/recovery resolution that reuses temporary states.
- [x] Add historical/as-of queries and stable coworker/household/care derivations.
- [x] Advance world/snapshot versions and preserve JSON, SQLite, replay, and headless boundaries.
- [x] Add deterministic proof fixtures without implementing future-stage content.

## Semantic Acceptance

- [x] Multiple independent concurrent jobs; ending one does not end another.
- [x] Outside work, another demanding commitment, and care combine into meaningful life pressure.
- [x] Concurrent low-attention care consumes less exclusive capacity than high-attention care.
- [x] Care crosses households; unrelated co-residents create no kinship; kin remain related while living apart.
- [x] Valid multi-residence, household movement, promotion, organization transition, temporary leave/return, unpaid work, and independent work remain historical.
- [x] A short push may improve immediate output but creates later fatigue; sustained pushing loses effectiveness; recovery improves later capacity.
- [x] Unprompted organization/work/care classifications work without engine branching.
- [x] Feleti Teo, Elvira Nabiullina, Droupadi Murmu, Njoki Ndung'u, Tammy Duckworth, junior judicial careers, and citizen-legislator patterns fit the architecture without named special cases.
- [x] Backdated later records do not appear in an earlier sequence-bounded query.

## Validation and Completion

- [x] Add behavior-focused tests for all required Stage 5.1 acceptance cases and retain all 95 Stage 1–4 tests.
- [x] Prove JSON and SQLite round trips, deterministic replay, unrelated-order independence, dangling-reference detection, chronology rejection, and React/browser independence.
- [x] Re-run the Architecture Integrity Audit and record final dispositions and banked research.
- [x] Update architecture, systems, dependency map, acceptance tests, roadmap, and decision log.
- [x] Run format, lint, TypeScript, all tests, production build, headless demo, `git diff --check`, and dependency/security audit.
- [x] Move this plan to completed, record exact validation evidence, commit Stage 5.1 separately, verify Git state, and stop before Stage 5.2.

## Completion Record

- Completed on 2026-08-22 as the first bounded run of Stage 5; Stage 5 overall remains in progress.
- Stage 4 wording correction committed separately as `e2c9bc7 Correct political belief option wording`.
- `npm run validate` passed: Prettier, ESLint, TypeScript, 13 Vitest files / 111 tests, production Vite build, and deterministic headless demo all succeeded.
- The validation demo reproduced exactly and reported six people, eleven events, one organization, two work relationships, two households, and one care responsibility.
- `npm audit --audit-level=high` completed against the registry with zero vulnerabilities; `git diff --check` passed.
- Deterministic JSON and Node-only SQLite tests preserve the complete world schema 6 / snapshot format 5 graph.
- The final Architecture Integrity Audit records the legacy biography availability boundary, the Stage 5.3 education/organization bridge, Stage 5.4 dwelling/resource ownership, and Stage 7 organization hierarchy/law as explicit future migrations.
- No Stage 5.2+ gameplay or player UI was added.
