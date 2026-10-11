# Worlds open in 2026 with recent life records

Measured: three generated worlds opened on January 1, 2026 with dated recent-life records. Opening time was 1.22–1.31 seconds after imports, and each input passed the existing size budgets. The new entry point is built for the separate finisher to adopt in the bench. Actual M1 economic, law, budget and demographic histories arrive in Part 2.

## What is built

Inferred from the code: `openHistoryWorld` defaults to January 1, 2026 and accepts another supplied date in that year. `prepareHistoryOpening` accepts an existing input with a 2026 date. Both return the live core, prepared input, history receipt and opening-economy receipt. [Entry points](../../opening-history.ts).

Inferred: generated deep past stops before January 2021. The existing life builders also fill the recent window, while preserving established facts and their original IDs. Recent facts are indexed by person and month. Their existing estimates retain source labels and stopgap markers. These records describe the supplied opening population; causal job losses, moves, births and deaths await the M1 engines. [People pass](../../history-people.ts).

Inferred: ordinary registered modules may implement a versioned pre-start pass. Each pass chooses economy, people or governments, and monthly or quarterly intervals. Each economy pass completes its window before people; governments follow people. An optional dependency list names required producers. Dependencies within a phase sort before any pass writes. [Contract](../../history-contract.ts).

Inferred: the callback receives the canonical core API and a frozen interval with an inclusive beginning and exclusive end. The live clock stays on the opening date. Historical records belong in the module's indexed tables; starting conditions use the existing writers. Historical facts do not require backdating live `emit` calls. No day hooks or institutional calendar dispatch run during history. A failure retains written rows for diagnosis and requires a fresh world. [Runner](../../history-run.ts).

Inferred: a module author declares its entry as `HistoryModule`, registers it through the existing `registerModule`, and supplies it in the opening's `modules` option. The opening automatically includes `history-people`. The prepared input stores snapshots of the supplied modules. [Opening integration](../../opening-history.ts).

## Measured checks

The [receipt](evidence.json) records exact revisions, seeds, places, names and fact IDs. Draws came from all 56 jurisdiction identities. Each generated world has 800 residents.

| Place                       | Base opening | Head opening |    Input | Recent records |
| --------------------------- | -----------: | -----------: | -------: | -------------: |
| Bethlehem, Georgia          |      1.296 s |      1.312 s | 47.90 MB |            601 |
| Plum Branch, South Carolina |      1.259 s |      1.290 s | 51.08 MB |            257 |
| Silver Firs, Washington     |      1.182 s |      1.221 s | 46.96 MB |            724 |

Measured: opening time increased 1.2–3.3%; input size increased at most 1.6%. Source share stayed under the unchanged ceiling. Head opening peak process memory reached 1.15 GB. [Loading receipt](evidence.json).

Measured: the matched 31-day median was 35.1 seconds at head and 41.0 seconds at base. The ratio, 0.856, passes the 5% M1 limit and the 20% core guard. All eight processes used the same prepared input and produced 8,680 acts each. Peak process memory reached 3.00 GB. Timing variability remains; this matched-month guard does not judge an annual world or browser loading. [Runtime receipt](evidence.json).

Measured: the 21 focused cases passed across bounded runs. Startup deep-past, module-state and calendar checks passed 24 cases. Core2 types, scoped lint and formatting, PR release checks and zero-dice passed. The base has no bench script, so bench play remains a finisher task.

## Finisher route

Read `docs/packages/M1-history.md`, `M1-common.md` and M1-14 from main; the stacked base predates their approval. Adopt the opening entry point in the bench and play three new games drawn from all 56. Verify the supplied date, named people's recent records, preserved earlier facts and measured loading. Clear or justify inherited estimates. M1-14 stays pending while Part 2 is added.

Part 2 supplies real national and regional series, dated law phases, prior budgets and the renewal/jobs histories as each engine lands. Elections and lawmaking history arrive with M2 and M3.

## Reproduce and review

Run these focused checks from the registered cloud checkout:

```sh
npx vitest run --config src/core2/tooling/vitest.config.ts src/core2/history-contract.test.ts src/core2/history-people.test.ts src/core2/history-opening.test.ts src/core2/deep-past.test.ts
npx tsc --project src/core2/tooling/tsconfig.json --pretty false
```

Run heavy commands through `npm run storage -- run test -- ...`. The developer-only [measurement helper](measure.mjs) supports place selection, opening measurement, input preparation and month timing. Its receipts name the checked-out revision. Baseline and head ran sequentially in this same checkout, with one warmup and three measured runs per comparison. Prepared input files stay outside the checkout.

Measured implementation: `0aa6bfb2ad51ff945e2ee18a5000d3e34e9509c0`, stacked on core-pieces `8249aaba6473ea2ca7ac483199d8f55b547bd704`. The shared deep-past and opening edits were committed separately and [posted for SOL-1258](https://github.com/lamontaes/Political-Game-Git/pull/3918#issuecomment-6105003740).

Builder: CODEX-HISTORY, Codex/GPT-6; the package requests high because the opening affects every module. Runtime effort, exact model variant and usage are not exposed. A skill-required read-only report reviewer checks the handoff wording. Finisher send-backs: zero at this handoff. Final elapsed time and report-review events are recorded in the PR body. The first report review returned clarifications about generated estimates, head memory and evidence locations. The second requested a source for the guide’s module-integration paragraph. Both were repaired. Final report review passed. Each return and review duration is recorded in the PR body.

Fixed build issues: a new test used the wrong census byte field; the measurement helper's synchronous Git subprocess was blocked. Neither repair changed an accepted feature test. Writable storage state and npm cache resolved missing home directories. GitHub Project mutation is unavailable in the connected tools; the branch and draft PR record the package claim.
