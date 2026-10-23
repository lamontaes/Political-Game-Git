# The docs

Current as of 2026-10-23 (ended status files, work orders, M0 packages and old roadmap files moved to `archive/2026-10-23/`)

Two months of work left more than 5,000 files here. Most are history. This page says what to read. Every live doc carries a `Current as of` line under its title; one without it is stale (`.agents/skills/doc-freshness/SKILL.md`, `npm run docs:fresh`).

## Current

| Read                                                                                                 | For                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md` (root)                                                                                   | The rules. The only rulebook.                                                                                                           |
| `ARCHITECTURE.md` (root)                                                                             | The engine as built.                                                                                                                    |
| `pool/README.md`, `pool/INDEX.md`                                                                    | All the work, and how to take it. The only backlog.                                                                                     |
| `coordination/OWNER-DECISIONS.md`, then `coordination/DECISION-REGISTER.md`                          | Rulings; read them before asking anything. `coordination/prior-rulings/` holds older digests by area.                                   |
| `coordination/CTO-HANDOFF-<date>.md` (newest)                                                        | Where the CTO left things; read with `.agents/skills/cto/SKILL.md`.                                                                     |
| `coordination/words.md`                                                                              | The Words line's open PR stack.                                                                                                         |
| `ROADMAP.md`, `roadmap/political-process-baseline.md`, `roadmap/features.json`                       | Scope, the golden path and every milestone spec (the golden-path suite reads `features.json`).                                          |
| `design/core2-porting-plan.md`, `design/old-core-retirement-map.md`, `design/one-model-two-tiers.md` | What has moved to the new core and what is left.                                                                                        |
| `reports/`                                                                                           | Dated reports; the newest on a subject wins. Wiring matrices: `reports/law-wiring-*`, `reports/effect-web-*`, `reports/trait-wiring-*`. |
| `release/README.md`, `release/changes/`                                                              | Release declarations.                                                                                                                   |
| `grading/`                                                                                           | English-engine grading batches merged so far; newer batches are on the Words PR stack.                                                  |
| `ui/kit13/`, `ui/mocks/screens-2026-10-14/`                                                          | The approved look and the screens.                                                                                                      |
| `packages/M6-screens.md`, `packages/M7-early-access.md`                                              | Screen order and the early-access checklist.                                                                                            |

## Reference

These are still accurate; read them when relevant:

- `GAME-CONSTITUTION.md`: product principles. Where it allows randomness or teaching steps, `AGENTS.md` wins.
- `packages/`: the other work-package specs. Their model, owner and branch lines are out of date; the pool replaced them (pool item `release-repo-archive-docs` archives them).
- `research/` and `reference/`: sources and captures.
- `decisions/`: the old decision log.
- `systems/`: six art, scene and source docs that the skills link to.
- `writing/`: report-standard samples.

## History

Everything else describes the old engine or processes that ended in October 2026 (pillar sessions, status boards, Drive docs, lanes, overnight mandates, work orders). Don't follow it:

- `archive/` (the Oct 23 move: the per-session status files and `BOARD.md` from `coordination/`, every `work-orders/` file, the `M0-*` packages, `roadmap/PROGRESS.md`, `roadmap/later-specs-draft.md` (its 40 specs are in `features.json`), `roadmap/model-log.md`, and five undated reports on the old engine and old PR bodies);
- `codex/`, `handoff/`, `plans/`, `integration/`, `audits/`, `findings/`, `playtest/`, `connectivity/`, `prose-inventory/`, `agent/`, `art/`, `mockups/`, `batches/`, `cto-findings/`, `appearance/`, `dehardwire/`;
- most of `systems/`;
- `coordination/CTO-HANDOFF-2026-10-16.md` (superseded by the Oct 19 handoff);
- the top-level `FIRST-BUILD-SPEC.md`, `UX-FLOW.md`, `ACCEPTANCE-TESTS.md`, `SYSTEM-DEPENDENCIES.md`, `ARCHITECTURE-INTEGRITY-AUDIT.md`, `LOCAL-REGISTRAR.md` and `DRIVE-PUBLISHING.md`.

Some history files are read by tests or scripts by path (for example `codex/ui-logo-packet/01_kit12_ui/kit12.css`, read at runtime, and `codex/audit-verified-2026-10-01.json`), so files there are marked rather than moved.
