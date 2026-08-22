# Stage 3 Political Belief, Principle, Knowledge, and Expertise Foundation

Status: COMPLETE

## Goal

Implement a sparse, data-driven, append-oriented foundation for proposition-specific political beliefs, broad principles, political speech and commitments, subject familiarity/understanding/expertise/practical experience, and structured queries while preserving deterministic world identity and Stage 2 history.

## Plan

- [x] Read `AGENTS.md`, the Game Constitution, accepted decisions, architecture, character/belief/history/relationship systems, build/UX contracts, acceptance tests, and applicable Sites guidance.
- [x] Audit the current world schema, person scaffolding, history records, materialization, snapshot integrity, SQLite repository, demo, viewer, and tests.
- [x] Define a small stable policy catalog with domain, issue, proposition, and structured subject records that remains external to sparse per-person state.
- [x] Replace string-array expertise scaffolding with structured, provenance-bearing subject knowledge and expertise records derived from factual education/occupation where appropriate.
- [x] Add append-only private belief, public-position, campaign-commitment, and broad-principle records with stable IDs, categorical dimensions, explicit provenance, and optional historical-context links.
- [x] Implement validated immutable transitions and non-prose query APIs for current/history/date-specific positions, commitments, principles, subject knowledge, relevant practical experience, domain coverage, and belief context.
- [x] Advance world/snapshot schema versions with explicit rejection of unsupported older snapshots; retain SQLite outside the simulation and preserve established facts/history.
- [x] Extend deterministic synthetic fixtures enough to exercise the architecture without building opinion formation, elections, campaigns, legislation, Life Mode, or large content libraries.
- [x] Extend the diagnostic viewer for beliefs, belief history, public positions, commitments, principles, knowledge/expertise, and provenance without ideological, personality, or relationship scores.
- [x] Add comprehensive tests for unusual combinations, real no-opinion states, related-proposition divergence, private/public/commitment separation, belief change history/context, knowledge-belief independence, factual-history-derived expertise, sparse scaling, persistence, and determinism.
- [x] Update architecture, belief/character/history system contracts, acceptance tests, build/UX scope, and the decision log.
- [x] Run formatting, lint, typechecking, tests, production build, deterministic demo, full validation, and dependency audit; fix failures.
- [x] Record results, name the exact recommended Stage 4 engineering task, and move this plan to `docs/plans/completed/`.

## Guardrails

- No universal liberal/conservative source-of-truth score, party-normalized belief bundle, or per-person field for every proposition.
- Missing belief records mean no formed belief; they are never synthesized as neutral or 50%.
- Private belief, public statement, commitment, and historical action remain distinct and append-oriented.
- Principles may conflict or qualify one another and do not automatically create issue positions.
- Historical experiences provide optional context; they do not automatically change player beliefs or imply one correct interpretation.
- Expertise affects capability and context, not political correctness or ideology.
- Existing personality/goal string scaffolding will not drive beliefs; final personality, goals, and autonomous NPC reasoning remain Stage 4 work.
- The viewer remains diagnostic and exposes no raw ideology, personality, persuasion, or relationship meter.
- The hosted viewer remains stateless; local durable saves continue through the Node-only SQLite snapshot repository.

## Completion Record

- Added world schema 4 and snapshot format 3 with a stable shared policy catalog plus sparse append-only proposition-exposure, private-belief, public-position, campaign-commitment, principle, and subject-knowledge histories.
- Removed string-array expertise and generated personality/goal scaffolding; education and occupation facts now carry structured subject IDs and support categorical, provenance-bearing knowledge profiles.
- Added validated immutable political transitions, date-aware proposition/domain/history/knowledge/practical-experience queries, deterministic authored diagnostic fixtures, and a developer political-profile inspector with no raw ideology, personality, or relationship scores.
- Hardened chronology and provenance validation across the full graph: historical references must precede their consumers, subjective records cannot predate their people, event-backed speech must match the speaker and date, memories require experience or prior knowledge, and explicitly third-party sources cannot self-reference.
- Added tests for unusual combinations, no-opinion distinctions, related-proposition divergence, private/public/commitment disagreement, append-only belief changes, trusted cues, principles without inference, expertise-belief independence, fact/event provenance, decades-long event relevance, 2,000-proposition sparsity, schema tampering, JSON/SQLite persistence, deterministic replay, runtime/load rejection, and inaccurate secondhand information.
- `npm run validate` passes: formatting, lint, TypeScript, 62 tests in 8 files, production build, and deterministic headless demo.
- `npm audit --audit-level=high` reports 0 vulnerabilities.
- Sites-compatible local build output was refreshed by the required production build. No hosted-source export or deployment was performed because external source export requires separate authorization.

## Exact Recommended Stage 4 Engineering Task

Implement a deterministic, explainable NPC belief-formation proposal evaluation service that consumes sparse beliefs, principles, subject knowledge, relevant experiences/memories, cues, relationships, constituency/incentives, and keyed RNG to emit proposed append-only belief changes with reason traces—without automatically applying them to player characters.
