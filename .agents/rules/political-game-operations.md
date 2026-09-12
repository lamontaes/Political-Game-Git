# Political Game Operations

- AGENTS.md/repository authority order remains binding;
- scope comes from the current Drive assignment and owning packet; historical stage and run labels neither grant nor withhold authorization (see `repository-reference.md`);
- preflight is required before substantial work;
- handoff is required when pausing/transferring substantive work;
- summaries are not proof of implementation;
- verify actual repository and execution state;
- prefer small persistent mechanisms over giant repetitive prompts;
- perform a LEARN pass after substantial tasks.

## Task and model routing

Practical guidance for choosing effort — not automatic model switching.

| Work kind                                                                     | Default worker                                 | When to use                                                                                |
| ----------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Mechanical scoped change (format, link fix, single-file repair, focused test) | Composer 2.5 Standard                          | The task has a named file surface and a bounded proof path                                 |
| Difficult multi-file implementation                                           | Cursor Grok 4.6 at an explicitly chosen effort | A demonstrated nonmechanical issue after focused iteration                                 |
| Consequential design, identity, or acceptance decision                        | Existing responsible owner                     | Requires a focused independent check; no self-approval                                     |
| Helper delegation                                                             | One bounded deliverable                        | Read-only default; parent integrates; Codex caps helpers at two per session when supported |

Without model-selectable helpers, keep one worker instead of inventing an orchestration service.

## Test cadence

During edits: `npm run agent:test-cadence` for focused commands matched to changed files.

Before readiness/LAND: `npm run agent:test-cadence -- --readiness`, then record exact-source stages with `node scripts/agent-run-receipt.mjs`.

Prior-head failures, cancelled browser jobs, and skipped CI stages are historical until reproduced on the current head.
