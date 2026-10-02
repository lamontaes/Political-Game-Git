# A10 pending executive clemency trace reuse

Base: `83335d2c4290c061b27a1fc2e4a03435e2eecbf4`; released `state-governing.ts` blob `d061a152c83f56cd815ef011e0ed713f138dc135`. Audit contract: #1615 comment 5949363431. Team2 clean physical-writer release: #1615 comment 5949568939.

Only the clemency branch of `governingNpcDecisionHandler` changes. Before appending, it checks for the same stable decision context with an actual saved nonselected trace and null choice. The actor, petition, date, options, constraints, considerations and remaining context must match; only the history-sequence cutoff can advance after recording. Replay returns the original world pending without another trace or a selected decision. Changed contexts and selected traces do not take this guard. The whole-file comparison confirmed all unrelated bytes equal the released base.

Reuses: existing clemency evaluation, shared evaluator, durable trace writer, saved executive due item, real court/sentence/petition/governor records, smallWorld and the existing sourced court fixture. No new production exports or schema, altered decision engine, invented board or changed stable key.

## Executed proof

- Complete new changed file `clemency-pending-trace.test.ts`: **6/6 PASS**, 21.11s total / 4.16s bodies, unchanged 30-second case limits, one worker.
- Five places are sampled from the all56 catalog after checking sourced finite-term and executive-only route eligibility. A failing sampled place is never replaced. Each first actual due delivery records a canonical nonselected durable trace; repeat and serialized reload retain that exact trace, the open petition and undecided matter without history mutation.
- The test explicitly controls unavailable options at the domain evaluation boundary. The shared evaluator and durable trace writer remain real. This proves actual saved nonselected replay, **not naturally occurring first-evaluation indecision** on the pinned evaluator.
- Scoped two changed strict roots / 1044 imported files: **0 diagnostics**. Changed lint, formatting and whitespace checks pass. An initial nullable research-ceiling type error was fixed before runtime; its failed receipt remains preserved.
- Executed main `b7fb354bf732754ae36aa57b04d4e8bcb96bc920` and candidate static scans: **A10 5/5 → 5/5**, no flip. This behavioral prerequisite unblocks pending-clemency replay proof; static results do not establish board or prosecution completion.
- Cloud run override logged exactly `cloud container; CTO ruling Oct 2 4:37`. No cleanup, full suite, unrelated LOAD/browser check or official GATE.

## Separate ongoing work

CTO R11 authorizes an actual state-law board seating producer. LA/TX/CT positive assertions remain unchanged until the producer exists; unseated petitions stay pending and expiry remains supported. The separate unsupported-offense sentence-trace duplication at `prosecution.ts:875` still needs its own Audit contract. Neither is fixed by this guard. Earlier #1871 behavioral failures remain preserved.
