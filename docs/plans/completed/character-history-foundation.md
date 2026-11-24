# Persistent Character and History Foundation

Status: COMPLETE

## Goal

Implement the first durable character-life model: immutable factual biography, context-rich events, subjective memories and knowledge, contradictory claims, relationship histories, stable queries, progressive detail, and versioned local persistence that remain independent of React.

## Plan

- [x] Read `AGENTS.md`, the Game Constitution, decision log, architecture, relevant system documents, current build/UX/acceptance contracts, and persistence guidance.
- [x] Audit the current domain, public API, demo, viewer, and tests for compatible extension points.
- [x] Define stable JSON-safe character, biography, event-context, memory, knowledge, claim, and relationship-history records with explicit invariants.
- [x] Implement immutable state transitions and indexed query helpers without campaign, election, legislation, or dialogue behavior.
- [x] Extend deterministic progressive materialization so new detail respects all established biography and preserves events, claims, knowledge, memories, and relationships.
- [x] Add a versioned snapshot codec and SQLite save repository outside the pure simulation package, with schema initialization and round-trip verification.
- [x] Extend synthetic fixtures with representative life history, differing contexts, contradictory claims, inaccurate secondhand knowledge, and relationship episodes.
- [x] Enhance the existing diagnostic viewer for person timelines, event context, participants, known-by records, claims, and relationship history without exposing hidden scores.
- [x] Update architecture, relevant system documents, acceptance tests, and the decision log to make the new contracts authoritative.
- [x] Run formatting, lint, typechecking, comprehensive tests, production build, headless demo, and dependency audit; fix all failures.
- [x] Record results and move this plan to `docs/plans/completed/`.

## Scope boundaries

- Campaigns, elections, legislation, dialogue content, and polished player-facing UI were not implemented.
- The hosted viewer remains diagnostic and stateless; desktop/local save persistence uses SQLite behind a Node-only adapter rather than browser storage or Sites D1.
- Historical truth, memory, knowledge, claims, and relationship interpretation remain distinct and may disagree.
- No raw personality, affinity, trust, or relationship numbers appear in the viewer.
- All fixtures remain visibly synthetic; no detailed real-world Lexington facts were introduced.

## Completion record

Completed 2026-08-22. The implementation adds world schema v2, typed biography facts, structured event context, append-only subjective record families, relationship episodes and derived queries, deterministic materialization, a versioned snapshot envelope, and a strict SQLite snapshot repository. The diagnostic viewer now exposes person timelines, memories, relationship histories, event participants and context, known-by provenance, and claims without raw personality or relationship scores.

`npm run validate` passed: formatting, lint, typechecking, 32 tests across seven files, production build, and deterministic headless replay. `npm audit --audit-level=high` reported zero vulnerabilities.
