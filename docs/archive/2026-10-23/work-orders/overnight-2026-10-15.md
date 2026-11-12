# Overnight work orders for Astra (Codex), Oct 15 to 16, 2026

Written by the CTO (Fable) on the owner's word, Oct 15, night. Three Codex sessions run at once, each with its own assignment, then a shared pool. The owner's priorities, in his order: law-link, the economy and the core, laws. Read `AGENTS.md` first; every rule in it binds. Then `docs/coordination/OWNER-DECISIONS.md` and `docs/coordination/DECISION-REGISTER.md` before any question. Each order says what to build, the rules it must follow, and how the owner will play it to know it works.

## How every session works tonight

- One draft PR per order, on its own branch off `main` (`law/*`, `world/*`, `core/*`, `gov/*`, `pool/*`), plain pushes, never force. Nobody merges their own PR; the CTO merges in the morning.
- Checks run in your session on the files you changed only: typecheck, eslint, prettier, the tests for those files, `npm run zero-dice`. Never the full suite. One line at the top of the PR body with the result. A new file nothing reads needs no run.
- Every PR that will reach `main` carries a release declaration in `docs/release/changes/<id>.md` (`id` equals the file name; `impact: patch`, `minor` or `none`; `none` carries no title or section).
- Proof is a one-year run of the played world (`buildBenchWorld`, every module installed, a place and seed you did not choose), with the record ids of the people reached, in the PR body. A unit test on a small world proves nothing about play.
- Every shortcut is a registered stopgap in `src/core2/data/stopgaps.json` with a marker in the code; an owner's call is kind `owner-decision`, under **OWNER DECISIONS NEEDED** at the top of the PR body and in `OWNER-DECISIONS.md`.
- The owner does not read PR bodies. The PR body's first lines say what he can play now, in plain words.
- When your assignment is done, take the first unclaimed item from the pool below: write your branch name beside it in `docs/coordination/BOARD.md` under "Pool claims" in a one-line commit on `main`-bound branch `pool/claims`, or, if that conflicts, in your PR body's first line. Then keep going until usage runs out.

## Session A: law-link, every law reaches a named person (`law/*`)

PR #4116 (`codex/law-link`) connects the 59 laws in the catalog to paid effects and reads. It has not merged since Oct 12 because it conflicts with `main` every day. Do not merge `main` into it again. Rebuild it on today's `main`:

1. Read #4116's diff for what it learned (which engine reads each law, where the dollar posts), then write that fresh against the engines as they are now on `main` (`src/core2/modules/laws.ts`, `budgets.ts`, `law-reach/*`, the economy modules).
2. For each of the 59 laws: a different engine reads the law in force at the moment it decides or pays. A record on a person, a table nobody reads or a handler whose mechanic is "none" or "records" is a defect (owner, Oct 13). The eleven `SG-GOV-REACH-A-*` stopgaps (police oversight, juvenile age, carry permit, handgun age, stand your ground, discrimination, abortion, age verification, facial recognition, data privacy, local authority) are the record-only laws: each gets its read (who is marked eligible or barred, what price or payment changes, which decision cites it) or stays registered with the reason the world has no record for it yet.
3. The chain is the acceptance (owner, Oct 14): for each law you wire, one dollar or one rule followed to a named person and back out: the law in force changing, the payment or price that changed, the person it reached, the view or choice that moved, and the director's line. Most people are untouched; name the ones who were, by record id.
4. Knowing is a read: a person's stance cites a law only through a record of how they learned of it (news received, a talk, a notice).
5. Numbers in the parameter table, SOURCED, ESTIMATED or TUNABLE; real rates check totals, never pick one actor's outcome.

Close #4116 with a line pointing at your PR when yours holds. One PR may hold it all, or one PR per law family if that merges cleaner; say which.

**Owner plays it:** the council passes a law, and within the month a named person's paycheck, rent, price or eligibility changed because of it, and that person brings it up in a talk, citing where they heard.

## Session B: the economy and the core (`world/*`, `core/*`)

In this order, one PR each:

1. **Layoffs.** Layoffs run at 0.04% a month against JOLTS's 1.4%. Give firms demand that shifts (their sales against payroll by month, the region's and nation's conditions, a law's cost), so an employer lays off for its own reason when months of losses say so, never a rate. `src/core2/modules/jobs.ts`, `business.ts`, the macro and regional engines. Check: a year in a drawn place inside the JOLTS range for hires, quits and layoffs together, every job change with a reason on the record.
2. **Deposits at the town bank.** Households and businesses hold deposits at the town bank, the bank lends against them, and every dollar balances through `postJournal`. `src/core2/modules/credit.ts`, `accounts.ts`.
3. **Households fill new homes.** Builders' new units are taken by households whose own pull (rent against income, a new job, family) moves them, from the counted population too, never a schedule; a town's vacancy then moves rents. `housing.ts`, `renewal.ts`, the two-tier population.
4. **Core:** the old shims' imports rewritten and the shims deleted (the abandoned PR #4148 says which four); the two retired-core tests from #4201 deleted with a line; then the `core/*` branches on origin that never merged (`core/next`, `core/lease-end`, `core/closures-founded`, `core/drives-agency`, `core/all-places`): read each, carry forward what still applies onto `main` fresh, close the branch's PR with a line, and report what was dropped and why.

**Owner plays it:** a business in town lets people go after a bad stretch and the news says why; someone he knows moves into a new apartment building; the bank's books balance on the Money screen.

## Session C: the legislatures and the officeholder's day (`gov/*`, `office/*`)

1. **One office-day engine on `main`.** Three branches hold the officeholder's day: `office/local` (council member and mayor: the meeting as a scene, the desk, acts of office; proven), `office/state` (#4225, half built) and `office/federal-engine` (representative and president, built on the local engine). Merge local, then federal, then as much of state as is proven, onto one engine (`src/core2/modules/office-day.ts`, `office-day-registry.ts`, `office-day-levels.ts`), with each level's calendar from data. Finish the state checklist in `docs/coordination/OFFICE-STATE.md`: session and committee days, leadership as people, the district office, pay and per diem cited, the governor's appointments, orders, budget proposal, line-item veto where the state has it, the State of the State.
2. **Election and legislature defects** (each a "why" the record can't answer; one commit each, in one PR):
   - A race's winner is a seat-term id (`official:term:seat:...`), not a person, when the words ask who won. The voting module's result resolves to the person holding the term before anything reads it.
   - A passed local bill with no title and no provisions on record (`2027-2` in Pine Ridge, South Carolina, seed in `docs/grading/words-batch-11.md`). A bill is not introduced without a title and at least one provision.
   - A body is named by a member's title ("County of Darlington commissioner"). Every body's name comes from its own record (board of commissioners, county council, town council), and the salutation bank reads that body, never Congress's default.
   - A sitting member of Congress was filed for town council and lost the House seat on winning (Orem, Utah, seed `fed-filing-1`). An officeholder files only for an office their situation makes them want, and holding two incompatible offices is barred by the place's law in data.
   - National outlets decline a sitting president as not newsworthy and print none of the president's acts.
3. **Federal candidates in federal races, and the empty race.** Candidates for Congress and president come from the whole state or nation, from their own standing and reasons; a race nobody files for is decided by the place's law (appointment, the seat stays vacant, a special election) and recorded. #4256 (`gov/state-federal`) is the state-level half with conflicts; rebuild its proven part on `main` and close it with a line.

**Owner plays it:** he takes a seat on the council, sits through a meeting on its real night, votes, and the next morning a passed bill waits on the mayor's desk; a governor's day and a representative's week run from a dev script with the real calendar.

## Session D: the pool worker (`pool/*`)

Session D has no assignment of its own. It starts on the pool at once and works it to completion: top to bottom, claiming each item before starting it, one draft PR per item, and it does not stop while any item is unclaimed or unfinished. When an item is blocked by another session's unmerged work, it writes the blocker in one line in its PR body and takes the next item; it comes back to the blocked one last. When the pool is empty, it takes the next open `faked-mechanic`, `missing-record` and `missing-mechanic` stopgaps in `src/core2/data/stopgaps.json`, one engine per PR, until usage runs out. It never waits on anyone.

## The pool, for Session D first and for whoever finishes an assignment (claim before starting)

1. Committee markup trades: members trade votes for sections in committee, where most bills die (`legislature.ts`; follows #4281's floor trades).
2. The eleven record-only laws' reads, if Session A did not reach them all (take the next unwired family).
3. Stopgaps by kind: every `faked-mechanic` stopgap in `src/core2/data/stopgaps.json` (37): replace the fake with the mechanic or delete the feature that needs it; then `missing-record` (15). One PR per engine. Never close a stopgap by deleting its row.
4. The journal of an officeholder: taking office, a vote cast, an interview and a town hall each become a "My life" entry from the record (`src/director/journal.ts`, the office-day engine's act records).
5. The unit suite follows what the game does now (#4309, `release/green-suite`): a test of the retired old core is deleted with a line; a test of the new core, the bench, the director or the release machinery that broke is fixed at the root, never skipped.
6. Stale pool PRs from Oct 10 and 11 (`pool/*`, `english/*`, `codex/session35-*`, `cto/title-people-national-scenes`): for each, one line in a single closing PR saying superseded by what, or carried forward where; then close them. Nothing is deleted from history.
7. **The outcome map.** Every law's effect on the town as a read by the engines that pay or decide, not a table: for each law family in `src/core2/law-reach/`, the chain to a named person in a played world; a handler whose mechanic is "none" or "records" is replaced or registered with its reason. Picks up where Session A stops.
8. **Powers by level.** What a town, a county, a state and Congress may each legislate, tax and spend on, from data per place (home rule or Dillon's rule, each state's grant to its counties and towns, the federal enumerated powers), read by the authority check before a bill is introduced and by the executive before an order. One rule, all 56 places; no state named in logic.
9. **Wiring gaps.** Any engine whose output nothing reads, found by `docs/reports/trace-audit-2026-10-14/` or by a one-year run: wire the read or delete the writer. One PR per engine, naming the record ids read.
10. **Needs between sessions.** The open "Needs from other sessions" lists in `docs/coordination/OPUS-GOV.md`, `world.md`, `core.md`, `OFFICE-*.md`: each item is a wiring job for whoever claims it, now that the sessions that asked are gone. Claim one list at a time.
11. **Sales tax collected but the treasury short.** `src/core2/budgets.test.ts` "the sales tax in force is collected on the town's purchases, each level's share to its treasury" fails on main (`GOLDEN_PATH_SEED=cto1`: the treasury's liquid balance is below what the tax collected, `budgets.test.ts:237`). Pre-existing, not from the overnight merges. Follow the dollar: where the collected tax goes that is not the treasury, and fix at the root. Run the file with `--dir src` so stale copies under `.claude/worktrees/` are not picked up.
12. Party loyalty in state chambers is parked on the owner's license question (non-commercial data); do not build it.

The pool is not closed: a session that finds wiring the golden path needs and nobody owns adds it to this list in its PR and takes it.

## The CTO's morning check (owner, Oct 15, night)

"Never wait on anyone" means build against the smallest registered stand-in, never skip the gap. In the morning the CTO (or one read-only sub-agent) reads every overnight PR's diff for: a stand-in without a row in `src/core2/data/stopgaps.json` and a marker in the code; a stopgap closed by deleting its row; a test skipped or loosened; a feature that writes a record nothing reads; a state, city or GEOID named in logic. Any of these sends the PR back before it merges.

Not tonight's: the English engine and the director (`src/director/`, `src/presentation/english-*`, `data/english/`), which stay with the Claude Words session (owner, Oct 15, night; the CTO may move the director later). Everything else in the game is open to these sessions, the screens included once the overnight orders are done (`docs/work-orders/astra-2026-10-15.md`, Order 1).

## Paste prompt for each session

> Read `docs/work-orders/overnight-2026-10-15.md` in lamontaes/Political-Game-Git and take Session A (or B, or C, or D: the pool worker, who starts on the pool at once and works it to completion). Follow `AGENTS.md`. One draft PR per order on your own branch off main, checks in your session on changed files only, a release declaration in `docs/release/changes/`, proof in a played world in a place you did not choose with record ids in the PR body, and the first lines of the PR body say what the owner can play now. When your assignment is done, claim the first open item in the pool and keep going until you are out of usage. Never merge your own PR.
