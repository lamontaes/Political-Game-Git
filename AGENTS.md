# Repository Guide

Repository documentation is the project source of truth.

## Authority

Read in this order:

1. [Game Constitution](docs/GAME-CONSTITUTION.md) — binding product principles.
2. [Decision Log](docs/decisions/DECISION-LOG.md) — accepted, non-superseded decisions.
3. [Architecture](ARCHITECTURE.md) and [system documents](docs/systems/) — technical and domain contracts.
4. [Roadmap](docs/ROADMAP.md) and [System Dependencies](docs/SYSTEM-DEPENDENCIES.md) — sequencing and integration contracts; they do not redefine implemented behavior.
5. [First Build Spec](docs/FIRST-BUILD-SPEC.md), [UX Flow](docs/UX-FLOW.md), and [Acceptance Tests](docs/ACCEPTANCE-TESTS.md) — current scope and verification.

A lower-authority document or implementation cannot silently override a higher-authority document. Record conflicts explicitly; never weaken the Game Constitution for implementation convenience.

## Commands

- `npm run dev` — React development viewer
- `npm run demo` — headless deterministic demo
- `npm run test` — automated tests
- `npm run lint` — lint
- `npm run typecheck` — TypeScript validation
- `npm run build` — production build
- `npm run validate` — full validation suite

## Working Rules

- Keep `src/simulation/` pure TypeScript and runnable without React, DOM, or external APIs.
- Keep jurisdiction rules and sourced facts data-driven.
- Treat Lexington content as an explicit placeholder until sourced snapshots exist.
- Preserve stable IDs, seeded behavior, established facts, and append-oriented history.
- Update affected documentation and tests with behavioral changes.
- Start work in `docs/plans/active/`; move completed plans to `docs/plans/completed/`.
- Do not use proprietary code, assets, text, or implementation from other political games.
