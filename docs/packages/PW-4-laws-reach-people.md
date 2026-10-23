# PW-4: laws reach people as money and services; taxes don't stop; budgets move spending

Federal income tax, Social Security tax and state income tax stopped on January 1, 2027, because their starting-law rows end that day and nothing follows them, so withholding dropped to Medicare only. Congress passed no budget in three years, and when a local budget passed, no spending line changed. Laws in force reached people only as eligibility rows, never as a payment or a service. Six laws reached nobody in their towns. Two price rules switched on and off for one man each fall and winter. This package makes the law in force move money and services the way it does in a real town.

## Who builds it, where

- **Read first:** `docs/packages/PW-common.md`, then PW-1.
- **Builder:** one Opus session at **high**: this is the money the government moves, and every dollar must balance.
- **Branch:** `pw/laws-reach-people`, from `main` after PW-2 lands. Pillar: OPUS-GOV; it reviews the PR. Do not push to `opus-gov`.
- **Owned paths:** `src/core2/modules/laws.ts`, `src/core2/data/laws/`, `src/core2/modules/law-effects.ts`, `src/core2/law-reach/`, `src/core2/modules/budgets.ts` (the budget-to-spending path and withholding; not the budget vote itself), `src/core2/data/budgets/`, their tests, `docs/archive/2026-10-23/roadmap/PROGRESS.md`, a release note.
- **Not yours:** `voting.ts`, `elections.ts`, `candidacy.ts` (PW-3, PW-5).
- **Where:** the eight expiring rows are in `src/core2/data/laws/starting-law.json`; the effect kinds (eligibility, right, compliance, price, rule) are in `src/core2/modules/law-effects.ts`.

## Build

1. **Tax rows carry forward.** A starting-law row with an end date is a law that expires only if its source says so (a sunset clause, cited). The eight rows ending January 1, 2027 are tax-year rows copied from a one-year schedule. Fix the data: the row runs until a law changes it (`endDate: null`), with the citation that it is the standing rate, or add the following years' rows from the source if the rate is indexed (brackets are; the Social Security wage base is). Add a tripwire test: no law in force at the opening ends within the game's first ten years unless its row names the sunset in its source field.
2. **Passed budgets change spending.** Trace one passed local budget in a played-world run from the vote to the spending lines the budgets module keeps. Find where the passed figures stop (a table nobody reads, a date that never comes, the old budget "carrying forward" by default). Fix it so that on the fiscal year's first day the passed budget is the budget in force and each spending function's line is the passed amount. The payments that function makes in the year (payroll to the town's employees, program payments, contracts) draw on that line. The federal budget failing cloture every year is OPUS-OFFICIALS's problem (BOARD items 3 and 6); do not make it pass. Do make a passed federal budget, when one passes, move federal spending the same way.
3. **Laws pay and serve.** Add two record kinds to `law-effects.ts`. A `payment` is money moved to a person, household or business because of the law, with the law as source, through the cash journal so it balances. A `service` is a thing provided: a school seat, a permit, an inspection, a clinic visit. For each law in force in the starting-law set, classify it in data (`src/core2/data/laws/`): who it reaches (people by eligibility, businesses by kind, a budget line, a price), how (payment, service, compliance, price, rule), and how often. Then make the engine do it. Eligibility that results in a payment schedule pays on the schedule. A compliance rule on businesses reaches the businesses in the records (the town's books), not zero. A budget rule (balanced budget, reserve balance, pension contribution) reaches the budget line it constrains and is recorded there. A law that genuinely has no local effect in a given place (farmland protection in a place with no farmland in its records) gets a `no-local-effect` row saying why, from the place's data.
4. **Price rules do not flicker.** Find why two price rules switched on and off for one person each season and fix the cause (a seasonal eligibility read without hysteresis, a date comparison off by a boundary). Sliding scales, not thresholds.
5. **Breadth.** OPUS-GOV's audit says 6 of 74 policies reach people. After step 3, count again in the played world and put the number in the PR body: how many of the laws in force in the two towns reached at least one person, business or budget line. List those that did not, each with its `no-local-effect` reason or a bug.

## Acceptance checks (PW-1 letters F, G, H)

1. **F:** On two fresh seeds, a payroll receipt dated after January 1 of the second calendar year shows federal income tax and Social Security withholding, with the law rows as source.
2. **G:** At least one `payment` or `service` record with a law as source reached a named resident in the year, and every law in force reached at least one person, business or budget line or carries a `no-local-effect` row naming the place fact that makes it so.
3. **H:** A passed budget changed at least one spending line from the prior year's, and a payment in the new fiscal year draws on the new line. If no local budget passed on a seed, the PR body shows the vote record and the test uses the other seed; both seeds without a passed budget is a bug for PW-3 or OPUS-GOV, reported with record ids.
4. The money-balancing check passes: every law payment is a cash-journal entry from a funded account.
5. Remove the `fails` markers for F, G and H and show the suite green.
6. Year time before and after, same seed, within 20%.

## How the owner checks it

In `/play`, open a working neighbor's pay stub in February of the second year: federal income tax and Social Security are withheld. Open the town budget after it passes: next year's lines are the passed figures and the clerk's pay comes from them. Open a law in force and its "who it reaches" panel: real names, businesses or budget lines, or a sentence saying it has no effect here and why.

## Out of scope

Who votes on the budget and whether it passes (PW-3, OPUS-OFFICIALS). New laws (world-legislating, installed by PW-2). Council authority limits (OPUS-GOV audit item 9).
