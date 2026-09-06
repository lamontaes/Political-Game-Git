# Repository Guide

Truth is layered. No single location is "the" source of truth:

- The **canonical Google Drive current-control chain** owns CURRENT product, ownership, routing, and task state — what is authorized right now, and who owns it. Root [`CLAUDE.md`](CLAUDE.md) names the read order.
- **Live GitHub and the live repository** own EXECUTABLE implementation truth — what the code, tests, branches, PR heads, and CI actually are. Fetch it; never trust a remembered or local SHA.
- The **repository constitution, decision, architecture, and system documents below** remain the durable technical and product authorities within that hierarchy. They govern how work is built and what behavior is accepted; they do not decide what is currently assigned.
- **Historical plans, completion reports, evidence, and dated audits** are provenance. They record what happened. They are never current execution state or current authorization.

When a durable repository document and current canonical control disagree about what is authorized now, current control plus live repository state win. When current control and a repository document disagree about accepted behavior or architecture, record the conflict explicitly and resolve it deliberately — do not silently weaken an accepted contract for convenience.

## Durable technical and product authority

Read in this order:

1. [Game Constitution](docs/GAME-CONSTITUTION.md) — binding product principles.
2. [Decision Log](docs/decisions/DECISION-LOG.md) — accepted, non-superseded decisions.
3. [Architecture](ARCHITECTURE.md), [Architecture Integrity Audit](docs/ARCHITECTURE-INTEGRITY-AUDIT.md), and [system documents](docs/systems/) — technical, governance, and domain contracts.
4. [Roadmap](docs/ROADMAP.md) and [System Dependencies](docs/SYSTEM-DEPENDENCIES.md) — sequencing and integration contracts; they do not redefine implemented behavior.
5. [First Build Spec](docs/FIRST-BUILD-SPEC.md), [UX Flow](docs/UX-FLOW.md), and [Acceptance Tests](docs/ACCEPTANCE-TESTS.md) — scope and verification contracts.

A lower-authority document or implementation cannot silently override a higher-authority document. Record conflicts explicitly; never weaken the Game Constitution for implementation convenience.

## Commands

- `npm run dev` — player-facing React viewer (`?view=developer` retains diagnostics)
- `npm run demo` — headless deterministic demo
- `npm run test` — automated tests
- `npm run test:run-a` — focused Stage 6.5 semantic tests
- `npm run test:run-b` — focused Stage 6.5 conversation tests
- `npm run test:run-c` — focused Stage 6.5 working-document tests
- `npm run test:run-d-lite` — focused Stage 6.5 time/work tests
- `npm run trace:export` — deterministic causal-trace export (development diagnostic)
- `npm run compare:seeds` — multi-seed world comparison (development diagnostic)
- `npm run test:e2e` — Playwright browser proof
- `npm run lint` — lint
- `npm run typecheck` — TypeScript validation
- `npm run build` — production build
- `npm run validate` — full validation suite
- `npm run intake:environment` — environment master intake with declared source lineage
- `npm run derive:tiers` — derive the runtime raster ladder from an approved master
- `npm run scaffold:scene` — emit a scene authoring scaffold with explicit unknowns
- `npm run bank:art` — validate or normalize an asset-bank QA manifest
- `npm run coverage:state-legislatures` — regenerate the state elective-office identity coverage report
- `npm run readiness:art` — reconcile the asset request queue against art the project already owns

## Working Rules

- Keep `src/simulation/` pure TypeScript and runnable without React, DOM, or external APIs.
- Keep jurisdiction rules and sourced facts data-driven.
- Treat Lexington content as an explicit placeholder until sourced snapshots exist.
- Preserve stable IDs, seeded behavior, established facts, and append-oriented history.
- Update affected documentation and tests with behavioral changes.
- Run the Architecture Integrity Audit at major scope boundaries and whenever a new rule could affect completed work; earlier work is not grandfathered.
- Start work in `docs/plans/active/`; move completed plans to `docs/plans/completed/`.
- Do not use proprietary code, assets, text, or implementation from other political games.

## Scope and Authorization

- **Historical Stage and Run Labels Do Not Grant or Withhold Authorization**: Names like Stage 6, Stage 6.5, Runs A–D-Lite, and Slice E describe how the project got here. They are not the current frontier. What is authorized now comes from the current Drive Assignment Board, Staging Queue, and the owning packet — not from a stage label written into this file. Do not cite an old stage boundary to forbid work that current authority has assigned, and do not cite one to authorize work it has not.
- **Accepted Semantics Are Not Casually Reopened**: Behavior that has been accepted — the Stage 6 simulation baseline at `d792e79a`, the playable office, reusable shell, conversation, legislative working-document bridge, the canonical clock and scheduled-activity substrate, and the approved visual direction — stays as accepted. Extend it through its seams. Reopening, refactoring, or redesigning accepted semantics or the approved visual direction requires the current owning authority to say so explicitly; convenience, taste, and "while I was in here" do not qualify.
- **Scope Comes From Current Authority, Not From Ambition**: Law, institution, procedure, electorate, campaign, election, and governing systems are legitimate parts of this game and may be built when current authority assigns them. Build only what your assignment covers, through the accepted seams, and stop when its constraints are met. An adjacent substrate existing in the codebase is not authorization to build the next system on top of it.

## Art & Assets Constraints

- **Scene Art Hierarchy Principle**: Implement environments via a scene-first hierarchy: shared global assets → reusable environment families → jurisdiction/building deltas → explicitly justified hero environments.
- **Scene-First Design**: Adhere strictly to the scene-first / dossier-second / database-third presentation principle.
- **Provenance and Rights**: Preserve provenance and rights information for every source and future generated asset. Unknown rights status must remain unknown (do not infer public domain status or commercially reusable status from mere visibility).
- **No Fabricated Measurement Precision**: Never fabricate precise physical dimensions. Measurements must strictly distinguish confidence classes (e.g. `exact`, `plan-derived`, `specified`, `bounded-estimate`, `visual-estimate`). Missing measurements must remain missing, not guessed or zeroed out.
- **Deterministic and Testable Tooling**: Prefer deterministic, inspectable, and testable tooling over opaque manual state. Generate deterministic fixture and replay outputs. Ensure art schemas are continually checked.
- **Art-Pipeline Run Commands**: Art validation, inventory generation, and QA contact sheet generation commands have been explicitly added. Always run: `npm run validate:art`, `npm run inventory:art`, and `npm run qa:art`.
- **Scene Authoring Pipeline**: Adding a room is authoring data, not writing scene-specific React or CSS. Environment masters enter through `npm run intake:environment` with an explicit source-lineage declaration; runtime tiers come from `npm run derive:tiers`; scene geometry starts as a `npm run scaffold:scene` scaffold whose unknowns stay explicit. See [Scene Authoring Pipeline](docs/systems/scene-authoring-pipeline.md).
- **No Repository Upscaling; Declare External Ones**: The pipeline never enlarges a raster. An externally upscaled master (a Firefly upscale, say) is admissible as a candidate master ONLY with its lineage declared, and that declaration follows every derived tier into the manifest and the runtime. Never present an upscale as native detail, and never synthesize a tier the master cannot fill.
- **Lived-In, Not Legible**: Baked environment art may carry restrained non-readable texture. Anything the simulation owns — jurisdiction name or seal, campaign name, bill number, headline, agenda, election result, calendar date, map label, officeholder portrait, briefing slide — belongs in a declared dynamic surface slot, never in the picture.
- **Physical Art Identity Is Not a World Label**: A scene family describes what the art depicts; what the World calls it is supplied by the caller from canonical truth and is never inferred from a filename, a family id, or an access class. Scene access tags describe where progression might point; they grant nothing.
- **Art-Pipeline Stop Conditions**: A foundation-only art run stops when its constraints are met. Stop conditions written for a past run bound that run; they do not silently forbid work a later authority has accepted or assigned. Independent of any run, do not reopen accepted domain semantics and do not generate non-fixture final output images without explicit current authorization.

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
