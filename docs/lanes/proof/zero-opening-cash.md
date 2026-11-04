# A treasury can open with no reserve

Lane 2, November 4, 2026. Pool item: world-zero-opening-cash-json. Built unit evidence; this is not another whole-path confirmation.

The original opening-treasury writer stores `journalSequence: undefined` when the accounts engine correctly makes no journal entry for a zero transfer. With bookkeeping on, the unchanged finite-JSON guard refuses the government record. The fix omits the absent optional field. It keeps a real journal sequence of zero, the empty balance, the existing accounts writer and every validation rule.

## Reproduction and unchanged regression

On original main 69b9126328, replay 75ae3c9378284205, the unchanged legislature project-request test fails at openBudgets → government → moduleData: `Module data must be finite, acyclic JSON data.` One failed, 19 skipped, 10.00 seconds. The prior complete run on bill-values reports 15 passed / 5 failed at that same write (104.50 seconds). Neither result is counted as passing.

With this seven-line writer replacement on main bf4e8386cd, the unchanged `src/core2/legislature.test.ts` passes all 20 tests: 214.11 seconds of tests, 222.58 seconds total. No test file, assertion, law, vote or guard changed.

Run from the repository root, with the required environment:

```sh
OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192 GOLDEN_PATH_SEED=75ae3c9378284205 npm exec -- vitest run src/core2/legislature.test.ts --maxWorkers=1 --reporter=verbose
```

## The full world reads the record

[Reproduction script](zero-opening-cash.mts), [compact record evidence](zero-opening-cash.json). The script uses the unchanged failing test's first town draw: **Clifford, North Dakota (3814740), replay/world seed 75ae3c9378284205**. It opens the full bench world on January 20, 2025 and plays through January 20, 2026. The legislature test itself starts January 5, 2026; the full-world witness uses the game's normal opening date. No law, vote, payment or balance is supplied.

- US-ND saves `openingCash: { minor: 0 }`, with no journalSequence property. Federal cash keeps the real sequence **0**, and county/city deposits keep sequences 1 and 2.
- The ordinary treasury engine closes 12 months and makes 3,356 named-person payments from the initially empty state's later revenue. This is a count of payments, not distinct people or new law effects.
- Example: Catherine Green, `official:term:seat:US-ND:upper:001:0:2025-01-20`, receives **$2,460** in `journal:2025-02-01:883`, source `per-diem:official:term:seat:US-ND:upper:001:0:2025-01-20:2025-01`.
- Calling openBudgets both before and after the year reaches its existing duplicate-calendar rejection, but all opening markers, balances and journal sequence remain unchanged: no second funding.

```sh
NODE_OPTIONS=--max-old-space-size=8192 node --import tsx docs/lanes/proof/zero-opening-cash.mts
```

A fresh New Game passes four weeks in **Charlotte Amalie West, U.S. Virgin Islands / 9d40843730d189ad**, player person_7d8b76c16176269d. New-life, four weekly advances, resumes, scene and Journal all return HTTP 200. This unit opening does not claim the separate sane-session path.

Restoring only budgets.ts from main bf4e8386cd makes the same full-world observer fail immediately: the zero opening record has the journalSequence property (`true !== false`). Exit 1 is expected. The corrected source was restored byte-for-byte, SHA-256 2d50c0d82f780ddf21cb501909029f0c3392b8711da64fc71287377ba9536c3c.

The four-year comparison did not complete. On pinned main bf4e8386cd, Wolf Creek Colony, South Dakota (4672500), replay dc5525b9b709e9c4, host 4c46091479ea, years 1–3 took **86.3/198.0/188.5 seconds**. Year four crashed in official-pay.ts seat → startSalariedPost: `A salaried post needs a living person, a recorded employer and no shift hours.` This is another reproduction of the existing gov-official-pay-reseating-crashes-year-four item, not a treasury timing pass. The corrected run never started. The wrapper restored budgets.ts byte-for-byte. Base raw metadata records HEAD b58a4d66c0 and sourceMain bf4e8386cd because only this production file was temporarily replaced; this was a controlled source comparison, not a detached main checkout. The original logs/three-year receipt are retained under /tmp/lane-2-zero-opening-cash-speed-*.

The salary repair merged as #7217 (db7a019177fb4a4de87b24cd3b507ef8fb024657). Its corrected Wolf Creek run on df5caffa89 completed four years at 78.0/201.8/164.1/783.2 seconds. The zero-cash branch incorporates that exact producer by ordinary merge. Production source differs from df5caffa89 only in this seven-line budgets.ts return; this completed receipt is the controlled comparison base. It is not relabeled as latest main, which has additional unrelated changes. The zero-cash comparison now completes all four years within 20 percent, with all fingerprints and table digests identical. Independent main replay remains the checker's work.

## Checotah and drawn opening regressions

Lane 3's world-opening-treasury-not-finite-crash report is the same missing optional field. Exact main 3fd359c4ce9633f40f9fcf6427ed60b786af1950 fails Checotah with bookkeeping enabled; changing only this writer opens all four treasuries. US-OK has finite zero, not NaN. The federal opening retains real journal sequence zero.

The new opening-treasury-json.test.ts checks every government's finite opening amount, JSON round trip and absent sequence for zero cash, with bookkeeping enabled. It runs the reported world and two fresh draws from all 56 jurisdictions:

| Place                      | Replay                                                           | World seed                                                       | Result                                        |
| -------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| Checotah, OK 4013650       | 1acc04b6572d6ef2474607b73d0e7066b70ba9bcf5c519202b24a8c654ed707e | 47b06e171d253ce7139d26b0df3defc6376e0d99ab8022cebfbba3ff5d28b8dc | Four finite openings; US-OK zero, no sequence |
| Oakland Park, FL 1250575   | 1f67dd9fee9d631f:0                                               | a884190aa03e4358c3b4f52d8eeb33cae4acf5ad103dca225f5e416ec84288da | Four finite openings, sequences 0–3           |
| Matfield Green, KS 2045150 | 1f67dd9fee9d631f:1                                               | 31ab8a5af9e9b67ce6aaf8233130fa235b46f939adcf222e776288b56e1e4b6d | Four finite openings, sequences 0–3           |

All three pass: 47.31 seconds of tests / 56.72 total. Restoring only the original writer makes Checotah fail through the unchanged JSON guard (one failed, two skipped; 10.92 / 20.44 seconds); corrected source restored byte-for-byte. Reproduce with `OPENING_TREASURY_SEED=1f67dd9fee9d631f` and the required environment, `npm exec -- vitest run src/core2/opening-treasury-json.test.ts --maxWorkers=1 --reporter=verbose`. The unchanged legislature suite's earlier 20 passing cases remain pinned to their original source.

Integrated New Game passes **Big Pine Key, Florida / 769fd576a0db7190**, player person_ea79faa836e4182c, through four weeks; all new-life, advance, resume, scene and Journal requests return HTTP 200. This is unit proof, not another confirmed played path.

## Completed four-year comparison

Wolf Creek Colony, South Dakota (4672500), replay dc5525b9b709e9c4, host 4c46091479ea. Pinned repaired base df5caffa8908557f2c09d84bf9002e7c34e61ce1 versus zero-cash head 84acb1f3b969b3573619cde507a9a0459bab7bc3; only budgets.ts differs in production. No redraw or change to the benchmark.

| Year | Base seconds | Corrected seconds | Change  | Same fingerprint and every table |
| ---- | ------------ | ----------------- | ------- | -------------------------------- |
| 1    | 78           | 89.2              | +14.36% | Yes, 03f95ffdaa896df8            |
| 2    | 201.8        | 212.7             | +5.40%  | Yes, 27ee5b75b29b50a8            |
| 3    | 164.1        | 162.3             | -1.10%  | Yes, a7f922f457c5f3c1            |
| 4    | 783.2        | 793.2             | +1.28%  | Yes, a9eff2ac4a72c1aa            |

All four years complete through January 19, 2029. Maximum slowdown is 14.36 percent. Exit 1 is solely the absolute 120-second bar in years 2–4, which both versions exceed. The first sandbox attempt completed year 1 at 84.4s then failed while recording HEAD (`spawnSync git EPERM`); its log is retained, and the unchanged command was rerun with process permission. No partial or permission-failed run is counted as a four-year pass.

```sh
OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192 npm run speed:year -- --seed dc5525b9b709e9c4 --years 4 --max-seconds 120 --exclusive --baseline /tmp/lane-2-official-pay-wolf-after.json --same-records --out /tmp/lane-2-zero-opening-cash-speed-head.json
```
