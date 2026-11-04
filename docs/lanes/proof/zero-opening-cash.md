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

Four-year timing remains to be completed before submission. Independent main replay remains the checker's work.
