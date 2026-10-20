# The docs

Two months of work left more than 5,000 files here. Most are history. This page says what to read.

## Current

| Read                                                                                                 | For                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md` (root)                                                                                   | The rules.                                                                                                                              |
| `ARCHITECTURE.md` (root)                                                                             | The engine as built.                                                                                                                    |
| `pool/README.md`, `pool/INDEX.md`                                                                    | All the work, and how to take it.                                                                                                       |
| `coordination/OWNER-DECISIONS.md`, then `coordination/DECISION-REGISTER.md`                          | Rulings; read them before asking anything. `coordination/prior-rulings/` holds older digests by area.                                   |
| `coordination/words.md`                                                                              | The Words line's status.                                                                                                                |
| `ROADMAP.md`, `roadmap/political-process-baseline.md`, `roadmap/features.json`                       | Scope and the golden path (the golden-path suite reads `features.json`).                                                                |
| `design/core2-porting-plan.md`, `design/old-core-retirement-map.md`, `design/one-model-two-tiers.md` | What has moved to the new core and what is left.                                                                                        |
| `reports/`                                                                                           | Dated reports; the newest on a subject wins. Wiring matrices: `reports/law-wiring-*`, `reports/effect-web-*`, `reports/trait-wiring-*`. |
| `release/README.md`, `release/changes/`                                                              | Release declarations.                                                                                                                   |
| `grading/`                                                                                           | English-engine grading batches.                                                                                                         |
| `ui/kit13/`, `ui/mocks/screens-2026-10-14/`                                                          | The approved look and the screens.                                                                                                      |
| `packages/M6-screens.md`, `packages/M7-early-access.md`                                              | Screen order and the early-access checklist.                                                                                            |

## Reference

These are still accurate; read them when relevant:

- `GAME-CONSTITUTION.md`: product principles. Where it allows randomness or teaching steps, `AGENTS.md` wins.
- `packages/`: the other work-package specs. Their model, owner and branch lines are out of date; the pool replaced them.
- `research/` and `reference/`: sources and captures.
- `decisions/`: the old decision log.
- `systems/`: six art, scene and source docs that the skills link to.
- `writing/`: report-standard samples.

## History

Everything else describes the old engine or processes that ended in October 2026 (pillar sessions, status boards, Drive docs, lanes, overnight mandates). Don't follow it:

- `codex/`, `archive/`, `handoff/`, `plans/`, `integration/`, `audits/`, `findings/`, `playtest/`, `connectivity/`, `prose-inventory/`, `agent/`, `art/`, `mockups/`, `batches/`, `cto-findings/`, `appearance/`, `dehardwire/`;
- most of `systems/`;
- the session status files in `coordination/` (`BOARD.md`, `core.md`, `gov.md`, `play.md`, `world.md`, `people.md`, `fixer.md` and the rest), and `roadmap/PROGRESS.md`;
- the top-level `FIRST-BUILD-SPEC.md`, `UX-FLOW.md`, `ACCEPTANCE-TESTS.md`, `SYSTEM-DEPENDENCIES.md`, `ARCHITECTURE-INTEGRITY-AUDIT.md`, `LOCAL-REGISTRAR.md` and `DRIVE-PUBLISHING.md`.

Some history files are read by tests or scripts by path (for example `codex/ui-logo-packet/01_kit12_ui/kit12.css`, read at runtime, and `codex/audit-verified-2026-10-01.json`), so files here are marked rather than moved.
