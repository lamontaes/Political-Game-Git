# Trial work order: an unfilled opening raises its pay (GLM Flash)

Oct 17, 2026. One order, one builder (glm-flash), on its own branch. The acting CTO grades the PR.

## 1. Why this exists

Owner ruling, Oct 16 (`docs/coordination/OWNER-DECISIONS.md`, "Unfilled openings and pay"): an employer may raise what it offers for a job nobody takes, and there is no cap: "if they can't afford it they can't afford it; if they're stubborn they might not do it... there's no artificial shit in here like that; it's a simulation, so it calibrates from real life."

Today the first cut (PR #4838, `raiseUnfilledPay` in `src/core2/modules/jobs.ts`, about line 763) raises an open `PositionRow` by a fixed step: `jobsRaiseStepShare` (0.03) scaled by the owner's lean on the `jobs.raise-for-opening` decision, after a fixed wait `jobsRaiseAfterDays` (60), both TUNABLE in `src/core2/data/jobs/parameters.json`, and only while the last `BusinessTradingMonth` (sales less payroll, costs and compliance) can carry it. That is a locked step and a locked wait, which the ruling forbids. The empty seat's cost to the business is never read. On the other side, `reviewWorkers` (about line 1231) and `reviewCountedLooking` (about line 2154) read only the best open offer per occupation (`going`) as a pay gap that pulls a worker to look; nobody reads a named raised offer against their own ties to their employer, and in a year of play in ten places no opening stood long enough to be raised at all. This is a trial of one model; the CTO grades the PR.

## 2. What to build

Replace `raiseUnfilledPay` so that, each pay period an opening stands unfilled, its employer decides whether to raise the offer and by how much from its own records, on a sliding scale with no fixed step, no cap and no percentage per month in logic:

- The books: cash on hand after the month's obligations (`liquidMinor` on the organization, and `businessTradingMonth` from `src/core2/modules/business.ts`: sales, payroll, costs, compliance) and the margin the job earns (the opening's share of `annualDemandMinor` against its wage, as `reviewEmployers` already projects staff from demand).
- What the empty seat costs: the lost sales or output the engine already tracks for an understaffed business (the gap between `salesStaff` and `staffHeads`, or the capacity the books could not serve); if no such read exists, the seat's wage itself, and say so in the PR.
- How long the seat has sat empty (`openedAt`, `raisedOn`).
- The owner's traits through the existing `jobs.raise-for-opening` decision (`data/content/trait-decisions.json`): stubbornness or thrift lowers the raise, ambition or urgency raises it. Keep `raisedOn`, `raises`, `firstHourlyMinor`, `raisedBy` on the row.

The raised offer is read by the people who could take it. A full person already in a job in the same occupation reads the gap between their pay and the named offer against their ties to their employer (tenure as `tenureYears`, the `stay` lean, what they would lose), and moves when it is worth it, through `hire`, which already ends the old job with a `quit` record. A counted group in the same occupation reads the same rule and moves a share of its count (`heads`, `hireCounted`); one model, two tiers. The employer that lost the worker now has an opening of its own (`replacesJobId`, `replacesPersonId`).

Calibration: real wage growth for hard-to-fill positions and quit rates (BLS JOLTS quits; BLS ECI or the Atlanta Fed Wage Growth Tracker, switchers against stayers) are recorded in the parameter table as bands a report checks the year's totals against, never as coefficients that set a raise. `jobsRaiseStepShare` and `jobsRaiseAfterDays` are removed; the PR body counts what was removed.

## 3. Rules that bind it (AGENTS.md, by name)

No dice. Sliding scales and causes. An effect is a read, not a record (a worker reads the raised row, by record id). One model, two tiers. Wire to the world. Replace, never layer. One rule, all 56 places. Estimate, never UNKNOWN. Speed (a year not more than 20% slower, measured before and after on the same base, same machine, one process). Every number in the parameter table with a tag (SOURCED with citation, ESTIMATED with source and spread, TUNABLE with the spread it's checked against). Every shortcut a registered stopgap: a row in `src/core2/data/stopgaps.json` (id, kind, file, line, whatItFakes, why, addedBy, addedAt, replacement, status) and a `// stopgapId:` marker plus `api.stopgap(...)` in code. No hand-written player text. Look before you ask: read `docs/coordination/OWNER-DECISIONS.md` and `docs/coordination/DECISION-REGISTER.md` first; any question that remains goes under **OWNER DECISIONS NEEDED** at the top of the PR body, never as a stop.

## 4. Done when

- A one-year played world (`buildBenchWorld` from `src/bench/world.ts`, every module installed, as in `tests/golden-path/played-world.node-test.ts`; a place drawn from all 56 and a seed the builder did not choose; name both in the PR) shows the chain, written in the PR body by record id: an opening unfilled for N pay periods (the position row) → the employer's decision with its reasons (books, cost of the empty seat, trait) → the offer rising on named dates → a named person or counted group reading the gap and moving (the quit record and the hire) → the new hire paid at the raised rate (the job row and its payroll entry) → the old employer's new opening.
- Also one employer that could not afford it, or would not (trait), and left the offer alone, by record id, with the reason.
- A new test asserts the chain in a drawn place; `src/core2/jobs*.test.ts` and `src/core2/unfilled-opening-pay.test.ts` (rewritten for the new rule) pass (`npx vitest run <file>`).
- No new constant decides a raise: `grep jobsRaiseStepShare src/` returns nothing; the PR lists every parameter it added with its tag and source.
- The calibration report prints the year's raise sizes and switcher share against the recorded bands; it does not fail the build if outside.
- Dollars conserved: the raised wages paid equal what left the employers' accounts, shown in the PR.
- Typecheck, eslint and prettier on changed files; `npm run zero-dice`; `npm run release:check -- --mode pr`; a release declaration in `docs/release/changes/` (see its README).
- Speed measured and stated: `npm run speed:year` (or `node --import tsx tests/golden-path/runner.mjs` timing) before and after, same base, same machine.

## 5. How the owner plays it

In dev mode, watch a business in town with an empty seat raise what it offers over a few months, and a neighbor leave their job for it; the journal or the news says why.

## 6. Branch, PR and checks

Branch `trial/glm-flash/unfilled-opening-pay`, from main. Draft PR to main; body line 1 `Trial: an unfilled opening raises its pay (glm-flash)`; line 2 the gate line (checks run on changed files, and the result). Do not claim the pool item; do not touch `docs/pool`. Do not merge. Register your workspace before building: `npm run storage -- workspace --owner GLM-FLASH-TRIAL`. Set `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` on every npm command. Never `npm ci`, never `git clone` a second copy, never force-push.

## 7. What is graded

Architecture (replaced, not layered; the business engine keeps the books, jobs decides and hires). Systems reasoning (the chain by record id; dollars conserved). Reading (reuses `businessTradingMonth`, `decisionLean`, `going`, `hire`, `hireCounted`, `tenureYears` and the position row rather than new seams). Code quality. Rule compliance (section 3; any fixed step or cap is a fail). Autonomy (no question the register already answers). Proof (section 4, in a drawn place). Wall time.

Written by the acting CTO, Oct 17, 2026.
