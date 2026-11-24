# Stand-in triage: bench (Nov 10, 2026)

Owner test (Nov 10): kept 1 (with what the player sees), dropped 1 (too in depth), of which borderline 0.

Rows: 2. Still faked 2, already replaced 0, partly replaced 0, could not tell 0. Closes by: code 1, research 1, data 0, design 0, owner call 0. New items: 0.

| Stand-in                        | Still true? | What closes it | Pool item                                             | Size | May stay at early access?                                                                                              | In plain words                                                                                                                      | Where the player sees it              |
| ------------------------------- | ----------- | -------------- | ----------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| SG-BENCH-money-recent-months    | still faked | research       | none (dropped: too in depth (owner, Nov 10))          | S    | yes: a six-month display window is a view length, not a world fact; a TUNABLE row with the scroll-back check is enough | The Money sheet shows the last six months of cash because six looked right, not because anyone measured it.                         | dropped: too in depth (owner, Nov 10) |
| SG-BENCH-money-spending-reasons | still faked | code           | money-sheet-spending-by-reason-from-the-journal (new) | M    | no: a screen that lists only standing bills hides one-off spending; the sheet is a view of the journal                 | The Money sheet's where-it-went list shows only the standing bills and everyday living, so a one-off purchase or fee never appears. | The Money sheet he opens each month   |

## Evidence

- `SG-BENCH-money-recent-months`: src/bench/bank.ts:9-10 RECENT_MONTHS = 6, used at :85 slice(0, RECENT_MONTHS)
- `SG-BENCH-money-spending-reasons`: src/bench/bank.ts:94-140 groups core.finance.latestReceiptsByContract; src/core2/accounts.ts:395-404 receipt carries reasonKey but the journal postings (:408) do not. Cheap: one string per journal row, month index built on open.

## Questions for the owner

None.
