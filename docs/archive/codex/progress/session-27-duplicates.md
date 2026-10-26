# Session 27 duplicate work tickets

## Ticket DUPE-04: retire the second law-to-outcome map

**State:** open; current main still has a parallel inventory. `src/simulation/governing/law-effect-paths.ts:80` contains `DIRECT_PATHS`, `:236` contains `JUSTICE_PATHS`, and `:257` combines those lists with `OUTCOME_LINKS`. The CTO direction is to keep the outcome web and remove this second map. The old `causal-effects.ts` file and source importers are already absent from current main `343136ee`.

**Consumers to migrate before deletion:** `tests/unwired-laws.test.ts:8-9,20,41`; `tests/nationwide/housing-market.test.ts:4,272`; `scripts/world-report/run.ts:70-72,2150,2211,2267-2270,2369`; `scripts/unwired-laws/run.ts:6-7,46-47`; and `scripts/law-audit/audit.ts:14,109,238`. Replace inventory-based assertions and reports with queries grounded in the outcome web and the live law readers, then delete the module. Keep the existing outcome-web links as the source of truth.

## Already consolidated on current main

- Member vote choice is centralized by `src/simulation/governing/member-vote-decision.ts:15`; chamber roll calls and durable individual member decisions call it from `src/simulation/governing/chamber-votes.ts:1240` and `src/simulation/legislative-member-decisions.ts:166`.
- AU-02 effect records are the current path; `src/simulation/causal-effects.ts` and its source imports are absent from main `343136ee`.
- AU-04 reads a matching posted installment, capacity outturn, commitment, and measure-linked appropriation in `src/simulation/enacted-duties.ts:424-460`; outcome selection is at `:489-498`.
