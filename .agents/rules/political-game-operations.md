# Operations

- `AGENTS.md` is binding. Scope comes from the claimed pool item (`docs/pool/`), never from a historical stage or run label.
- Verify the actual repository and run state; summaries and a session's own claims are not proof of implementation.
- Prefer small persistent mechanisms (a skill, a check, a pool item) over larger prompts.
- After a substantial task, encode any recurring lesson in the smallest durable place: a skill line, a test or a pool item.

## Task and model routing (Cursor and similar)

Practical guidance for choosing effort, not automatic model switching. The owner picks models for Claude and Codex sessions per job (`AGENTS.md`, "Models, effort and helpers").

| Work kind                                                                     | Default worker                                 | When to use                                                                        |
| ----------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| Mechanical scoped change (format, link fix, single-file repair, focused test) | Composer 2.5 Standard                          | The task has a named file surface and a bounded proof path                         |
| Difficult multi-file implementation                                           | Cursor Grok 4.6 at an explicitly chosen effort | A demonstrated nonmechanical issue after focused iteration                         |
| Consequential design, identity, or acceptance decision                        | The owner, through the CTO                     | Needs an independent check; never self-approved                                    |
| Helper delegation                                                             | One bounded deliverable                        | Read-only by default; the parent integrates; Codex caps helpers at two per session |

## Test cadence

During edits: `npm run agent:test-cadence` lists focused commands for the files you changed. Before marking a PR ready: `npm run agent:test-cadence -- --readiness`. Failures on an earlier head, canceled browser jobs and skipped CI stages are history until reproduced on the current head.
