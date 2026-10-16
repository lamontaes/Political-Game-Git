# Trial work order: follow the federal dollar (four-model comparison)

Oct 16, 2026. One order, four builders (kimi, glm, qwen, step), each on their own branch. The acting CTO grades the PRs.

## 1. Why this exists

Owner ruling, Oct 16: "you don't just get an implicit multiplier; that's not how this game works... it's a simulation, so it calibrates from real life."

Today `macroFiscalMultiplier` (1.2, ESTIMATED, `src/core2/data/macro/parameters.json`) turns a change in federal outlays into output with one locked number. `publicBudgetImpulse` in `src/core2/modules/macro.ts` (about line 209) takes the federal budget in force, subtracts its base year's outlays (`baseBudget`), divides by `macroNominalOutputDollars`, multiplies by the coefficient, and feeds the result into `stepMacroMonth` as `macroPublicBudgetImpulse` (`src/core2/macro-model.ts`, about line 184). The dollars never land on anyone. Meanwhile `src/core2/budgets-treasury.ts` already pays the budget for real each month (`closeTreasuries`: public pay on the line, law-driven benefits through `registerLinePayments`, aid to lower treasuries, purchases to town businesses from `spending-payees.json`, the rest to the outside account), and macro already reads paid income by place and month (`townIncomeGrowth` on `finance.paidIncomeByPlaceMonth`). The impulse is a second, invented path beside the real one.

This is a trial: four models get the identical order; the grading is in section 7.

## 2. What to build

Remove `macroFiscalMultiplier`, `publicBudgetImpulse`, the `macroPublicBudgetImpulse` override in `runMonth`, and the `publicBudgetImpulse` / `publicBudgetRecordIds` fields on the macro month row. National output responds to a federal budget change only through the dollars actually paid:

- The budgets engine's payouts (payroll to public employers' workers through `notePublicPay`, transfers to households through the registered line payers, purchases from businesses in `closeTreasuries`) land on the people, households and businesses they reach, in the places they reach them, as journal entries (`accounts.transfer`).
- Those recipients spend by the rules the jobs, business and regional engines already have (`src/core2/modules/jobs.ts`, `business.ts`, `regional.ts`); nothing new is invented for "government money."
- Macro reads the resulting totals (the paid-income and sales reads it already has, extended only where a real payout today reaches no read). If a payout today lands only in the outside account, say so and route the town's share by the existing payee tables; don't add a coefficient to stand in for it.
- Counted groups receive and spend the same way as full people, times their count (one model, two tiers). A transfer line that reaches a counted household group must move its cash and its spending like a full household's.
- The research the old parameter cited (Monacelli, Perotti and Trigari 2010; CBO 2015 ARRA ranges, 0.4 to 2.5 by outlay type) becomes a calibration check on the resulting totals: a parameter-table row recording the band (ESTIMATED, with the citation and spread), read by a report, never by a line of logic that moves a number.

## 3. Rules that bind it (AGENTS.md, by name)

No dice. Sliding scales and causes. An effect is a read, not a record (another engine must read what the payout wrote, by record id). One model, two tiers. Replace, never layer (count what was removed in the PR body: the parameter row, the function, the override, the month-row fields, any test that asserted the coefficient). Wire to the world. One rule, all 56 places (no state, city or GEOID in logic). Estimate, never UNKNOWN. Speed (a year not more than 20% slower, measured before and after on the same base, same machine, one process). Every number in the parameter table with a tag (SOURCED with citation, ESTIMATED with source and spread, TUNABLE with the spread it's checked against). Every shortcut a registered stopgap: a row in `src/core2/data/stopgaps.json` (id, kind, file, line, whatItFakes, why, addedBy, addedAt, replacement, status) and a `// stopgapId:` marker plus `api.stopgap(...)` in code. No hand-written player text. Look before you ask: read `docs/coordination/OWNER-DECISIONS.md` and `docs/coordination/DECISION-REGISTER.md` first; any question that remains goes under **OWNER DECISIONS NEEDED** at the top of the PR body with an `owner-decision` stopgap, never as a stop.

## 4. Done when

- A one-year played world (`buildBenchWorld` from `src/bench/world`, every module installed, as in `tests/golden-path/played-world.node-test.ts`; a place drawn at random from all 56 and a seed the builder did not choose; name both in the PR) shows the chain, written in the PR body by record id: a federal budget change (the budget row) → named journal entries (the `accounts.transfer` receipts) → a named payee (a full person or a counted group, by record id) → their spending on a named seller (a business record and its sales receipt) → a regional or jobs read (the month row or factor that moved) → national output moved (the macro month row, before and after).
- `grep -r macroFiscalMultiplier src/` returns nothing; so does `publicBudgetImpulse`.
- Dollars conserved: what the treasury paid equals what landed on payees plus the outside account, shown in the PR.
- `src/core2/macro.test.ts`, `src/core2/budgets.test.ts`, `src/core2/finance-sales-budgets.test.ts` and the `src/core2/jobs*.test.ts` files pass (`npx vitest run <file>`); a new test asserts the chain in a drawn place.
- The calibration check reports where the one-year response (output moved per dollar of outlay change, as a share of output) falls against the cited band; it prints, it does not fail the build if outside.
- Typecheck, eslint and prettier on changed files; `npm run zero-dice`; `npm run release:check -- --mode pr`; a release declaration in `docs/release/changes/` (see its README).
- Speed measured and stated: `npm run speed:year` (or the golden-path runner's timing, `node --import tsx tests/golden-path/runner.mjs`) before and after, same base, same machine.

## 5. How the owner plays it

In dev mode, pass a federal budget line and watch a named person in your town get paid and spend it, then the economy page move.

## 6. Branch, PR and checks

Branch `trial/<model>/federal-dollar` (model = kimi, glm, qwen, step), from main. Draft PR to main; body line 1 `Trial: follow the federal dollar (<model>)`; line 2 the gate line (checks run on changed files, and the result). Do not claim a pool item; do not touch `docs/pool`. Do not merge. Cloud sessions set `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` on every npm command. Never `npm ci`, never `git clone` a second copy, never force-push.

## 7. What is graded

Architecture (replaced, not layered; engine boundaries kept: budgets pays, jobs/business/regional spend, macro reads). Systems reasoning (the chain by record id; dollars conserved). Reading (cites the real files and rulings; reuses `closeTreasuries`, `notePublicPay`, `registerLinePayments`, `paidIncomeByPlaceMonth` and the payee tables rather than new seams). Code quality. Rule compliance (section 3). Autonomy (no question the register already answers). Proof (section 4, in a drawn place). Wall time.

Written by the acting CTO, Oct 16, 2026.
