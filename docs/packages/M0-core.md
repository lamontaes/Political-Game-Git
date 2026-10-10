# M0-core: money that works, and the four core pieces

**Contract:** M0-08 (money that works for a year) and M0-09 (the four core pieces). See `docs/roadmap/features.json` for the exact tests.

**Builder:** SOL-1258, continuing (Codex, GPT-6.1 Sol). Parts 1 and 2 at **medium**: they're specified exactly by the profile and earlier reviews. Part 3 at **high**: it's core architecture every port depends on.
**Finisher:** a separate Claude session, **Opus at high**: it reviews core design and money conservation.
**Branch:** `pool/P8-part-1` (#3918), as now. Log one line per event at the top of `docs/roadmap/PROGRESS.md` (via your PR) and the PR body.

## Part 1: payday settlement and the profiler's fixes (medium)

1. A work shift records attendance and earned pay as a light accrual, with no cash journal. Today every shift pays cash (`src/core2/work-cash.ts`, `settleWorkResultJournal`), which is unrealistic and costs 85% of the slowdown measured in `docs/reports/2026-10-10-core2-slowdown-profile.md`.
2. Settle each worker once per pay period, on the employer's recorded payday, through the conserving journal with the same guards. A missed payroll is a real payday event when the employer can't cover it. Keep unpaid wages when a job ends.
3. Apply the report's fixes A to D: record only the fields the logic reads; drop the back-to-back read-log replays inside `seal`; make one replayed read cheap; keep only the selected offer and reasons in a work result instead of all of `decision.scores`, and return the frozen result instead of cloning it.
4. Re-time 31 days of the same seeded drives-proof route (seed `p10-drives-proof-2026-10-09`) against `cb6cf69d`, one warmup and three measured runs each, one process at a time on the same machine. Report both. A change may not make a year more than 20% slower than its base.

## Part 2: the judged money year (medium)

Run a full year in a randomly drawn place (and the existing benchmark place for comparison), three measured runs. It passes M0-08 when:

- under 10% of businesses close;
- sales pay more than half of all wages;
- every dollar balances;
- money coming in from outside is reported next to real public spending and Social Security per resident;
- national conditions stay flat and are labeled that way (the national economy arrives in M1).

If it fails, find the cause, fix it, and run again. Never top up firms just so they survive.

## Part 3: the four core pieces (high)

The approved interface additions from `docs/design/core2-porting-plan.md`, "What the new core's interface lacks":

1. **Module state:** each engine registers its own tables with indexes and a schema version.
2. **Accounts and postings:** named accounts and one balanced journal writer (`postJournal`); the money call becomes a wrapper around it; obligations come due.
3. **Module calendar:** engines place dated institutional work (election days, sittings, filing deadlines, court dates) with keys.
4. **Voter groups (cohorts):** a row of place, age band, lean, turnout and size, checked against real spreads and never drawn.

Let a module supply dated conditions from its own state on the calendar, so M1's national economy module can fill the dated `FinanceConditionInput` slot without editing finance. Each piece needs its own contract tests. M0-09 passes when the first two M1 ports can build on these pieces without patching the core.

## Out of scope

- People files (population, kin, deep past, closeness, contact, acts for look-ups and grief) belong to OPUS-PEOPLE (P15). Review its flagged core commits; don't redo them.
- Renewal (hiring, new businesses, births, moves) and full speed work come after M0.
- Don't edit `src/director` or `src/rules`.

## Hand-off

Mark M0-08 and M0-09 passing only with the test evidence, and ask the finisher to check. Keep receipts short (light process): what changed, the measured result, what's next.
