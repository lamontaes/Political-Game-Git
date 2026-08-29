# Repository Guide

Repository documentation is the project source of truth.

## Authority

Read in this order:

1. [Game Constitution](docs/GAME-CONSTITUTION.md) — binding product principles.
2. [Decision Log](docs/decisions/DECISION-LOG.md) — accepted, non-superseded decisions.
3. [Architecture](ARCHITECTURE.md), [Architecture Integrity Audit](docs/ARCHITECTURE-INTEGRITY-AUDIT.md), and [system documents](docs/systems/) — technical, governance, and domain contracts.
4. [Roadmap](docs/ROADMAP.md) and [System Dependencies](docs/SYSTEM-DEPENDENCIES.md) — sequencing and integration contracts; they do not redefine implemented behavior.
5. [First Build Spec](docs/FIRST-BUILD-SPEC.md), [UX Flow](docs/UX-FLOW.md), and [Acceptance Tests](docs/ACCEPTANCE-TESTS.md) — current scope and verification.

A lower-authority document or implementation cannot silently override a higher-authority document. Record conflicts explicitly; never weaken the Game Constitution for implementation convenience.

## Commands

- `npm run dev` — player-facing React viewer (`?view=developer` retains diagnostics)
- `npm run demo` — headless deterministic demo
- `npm run test` — automated tests
- `npm run test:run-a` — focused Stage 6.5 semantic tests
- `npm run test:run-b` — focused Stage 6.5 conversation tests
- `npm run test:run-c` — focused Stage 6.5 working-document tests
- `npm run test:run-d-lite` — focused Stage 6.5 time/work tests
- `npm run test:e2e` — Playwright browser proof
- `npm run lint` — lint
- `npm run typecheck` — TypeScript validation
- `npm run build` — production build
- `npm run compile:storm-corpus` — compile normalized NOAA storm events corpus and derived aggregates
- `npm run validate:storm-corpus` — validate storm events corpus integrity
- `npm run manifest:storm-corpus` — inspect national and jurisdiction storm coverage manifest
- `npm run test:storm-corpus` — focused NOAA storm events corpus tests
- `npm run validate` — full validation suite

## Working Rules

- Keep `src/simulation/` pure TypeScript and runnable without React, DOM, or external APIs.
- Keep jurisdiction rules and sourced facts data-driven.
- Treat Lexington content as an explicit placeholder until sourced snapshots exist.
- Preserve stable IDs, seeded behavior, established facts, and append-oriented history.
- Update affected documentation and tests with behavioral changes.
- Run the Architecture Integrity Audit at major stage boundaries and whenever a new rule could affect completed work; prior stages are not grandfathered.
- Start work in `docs/plans/active/`; move completed plans to `docs/plans/completed/`.
- Do not use proprietary code, assets, text, or implementation from other political games.

## Art & Assets Constraints

- **Stage 6 Baseline is Frozen**: The accepted Stage 6 baseline (commit d792e79a) is frozen. Do not reopen, refactor, or redesign Stage 6 simulation semantics.
- **Stage 6.5 Runs A–C Are Accepted; Run D-Lite is Authorized**: Preserve the accepted playable office, reusable shell, conversation, and legislative working-document bridge. Run D-Lite may add only its bounded canonical clock, scheduled activity, Work/Pending, and planning surfaces; do not begin Lexington Slice E or redesign the approved visual direction without another gate.
- **No Stage 7 Feature Creep**: Do not implement law, institution, procedure, electorate, campaign, or election engines. The bounded Run D-Lite calendar/work substrate is not authority for those systems.
- **Scene Art Hierarchy Principle**: Implement environments via a scene-first hierarchy: shared global assets → reusable environment families → jurisdiction/building deltas → explicitly justified hero environments.
- **Scene-First Design**: Adhere strictly to the scene-first / dossier-second / database-third presentation principle.
- **Provenance and Rights**: Preserve provenance and rights information for every source and future generated asset. Unknown rights status must remain unknown (do not infer public domain status or commercially reusable status from mere visibility).
- **No Fabricated Measurement Precision**: Never fabricate precise physical dimensions. Measurements must strictly distinguish confidence classes (e.g. `exact`, `plan-derived`, `specified`, `bounded-estimate`, `visual-estimate`). Missing measurements must remain missing, not guessed or zeroed out.
- **Deterministic and Testable Tooling**: Prefer deterministic, inspectable, and testable tooling over opaque manual state. Generate deterministic fixture and replay outputs. Ensure art schemas are continually checked.
- **Art-Pipeline Run Commands**: Art validation, inventory generation, and QA contact sheet generation commands have been explicitly added. Always run: `npm run validate:art`, `npm run inventory:art`, and `npm run qa:art`.
- **Art-Pipeline Stop Conditions & Forbidden Changes**: Foundation-only art runs must stop when their constraints are met. Their historical Stage 6.5 ban does not override the accepted Runs A–C or authorized Run D-Lite slice. You remain forbidden from reopening accepted Stage 6 domain semantics, implementing Stage 7 systems, or generating non-fixture final output images without separate authorization.

## Coding-Agent Operations

- **run agent preflight** before substantial coding-agent work;
- **verify exact workspace, branch, local SHA, and upstream SHA**;
- **use isolated worktrees** for concurrent work and agent takeovers;
- **treat paused source workspaces as read-only** during takeover;
- **never stash/reset/clean another agent's workspace** to simplify takeover;
- **never force-push** merely to simplify handoff;
- **re-fetch and verify remote branch head** immediately before publishing;
- **for player-facing visual work, passing automated tests do not equal human visual acceptance**;
- **semantic visible controls require actual pointer and keyboard activation tests**;
- **completion reports must include exact SHA, git state, tests actually run, remaining defects, and acceptance state**;
- **after substantial tasks, perform a small LEARN pass** and encode recurring lessons in the smallest appropriate durable mechanism;
- **do not solve recurring process problems merely by making prompts larger**.
