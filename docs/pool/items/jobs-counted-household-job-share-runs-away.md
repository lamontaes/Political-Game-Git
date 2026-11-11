---
id: jobs-counted-household-job-share-runs-away
title: "Counted households keep an untied share of jobs after their adults take real jobs, so a town ends with more jobs than adults (Wickliffe, Oklahoma: 1.7 jobs per adult among arrivals after three years)"
area: world
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: sonnet
effort: high
root: design-one-model-two-tiers
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 7, "The long world stops making sense", and root cause 5)
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-jobs-counted-household-job-share-runs-away
---

**What.** Counted households keep an untied share of jobs after their adults take real jobs, so a town ends with more jobs than adults. A counted household's work outside the town's firms is kept as a share, a number such as 0.4, tied to no particular adult (`unplacedWorkers`), while the same adults are also treated as jobless and looking. When one takes a real job, the job is added and nothing takes the share away, so the household holds both; arrivals compound it because a household that moves in is handed its new place's share per open adult. Measured by the Nov 9 audit in Wickliffe, Oklahoma (seed 8832429ff1e53841): 5.7% of adults at work at the opening, 125% after eleven years and 200% after eighteen; median household earnings went from $40,665 to $120,056 in eleven years; after three years the arrivals held 9,629 jobs for 5,586 working-age adults (1.7 each). With the share cleared once a month the audit's second run gave 0.5 jobs per adult and 64 of 7,025 household records over one job per adult, against 5,149 of 7,254 as the game stands; Frankfort, South Dakota (seed cd7e15c74e5f7692) gave 1.4 and 0.6. Seen: the Metrics tab's jobs and pay numbers and a household's card, where a town ends with 1.7 jobs per adult.

**Cause.** Found in code: src/core2/modules/counted-moves.ts `jobShare` (line 1508), `openWorkers` (line 1518), `unplacedRates` (line 1535) and the hand-over in `arrivals` (line 1381) set a household's `unplacedWorkers`; `hireCounted` (src/core2/modules/jobs.ts, line 3638) calls `addCountedJob` (src/core2/residents-economy.ts, line 67), which adds the job and the wage and never reduces `unplacedWorkers`, so a household holds both.

**Fix.** When a counted adult takes a real job, take that adult's weight off the household's share the same day, and stop handing arrivals a per-place share per open adult (tie each share to an adult, as the audit's call was). One adult never holds two jobs and is never paid for both; stop the outside account's pay for the share the same payday the real job starts.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted adult holds at most the jobs a full person could, by the same rule times the count, and a share that no adult holds is a second population of workers. Wire to the world: the share pays wages from the place's outside account, so removing it must stop that pay on the journal the same day the real job starts. Sliding scales and causes: a household's work changes because an adult was hired, laid off or moved, never because a per-place rate was handed to it on arrival. Owner, November 8: "ranges aren't targets"; this is one adult holding one job, not a pull toward a real employment rate.

**Done when.** A second session, not the builder, runs this in the running game. Start the bench (`npm run bench`, play at `/play`) with the Place field empty so the place is a drawn place, and write down the place and seed. With dev mode's Run on the Calendar, advance three years, 366 days at a time. After each year read the Metrics tab's People at work and dev mode's Watch panel: the jobs held by counted households, share included, never exceed their working-age adults, in total and for the households that moved in (the builder adds that line to Watch from the same records if none shows it; a screenshot each year). Then the two named repros, Wickliffe, Oklahoma, seed 8832429ff1e53841, and Frankfort, South Dakota, seed cd7e15c74e5f7692, three years each: arrivals hold at most one job per adult and no household record holds more jobs than adults; the audit's cleared-share figures (0.5 and 0.6 jobs per adult) are reported next to the result. Follow the dollars in a twin world with and without the fix, by account: the outside account pays a household less on the payday after its adult takes a real job, by record id, and the journal balances. A test in `src/core2` draws a place, plays a year and fails if any counted household holds more jobs, share included, than working-age adults.

**Waits on.** Pull requests 8157 and 8158 on main. They change `unplacedRates` in src/core2/modules/counted-moves.ts (it now counts people, each record times the households it stands for) and the counted hiring path in src/core2/modules/jobs.ts, the same functions this item names, so the line numbers in the Cause will move. After they merge, run the Done when's three-year measurement first: if the share no longer runs away, write the numbers in this item and close it; if it still does, build the Fix on that code.

**Files.** src/core2/modules/counted-moves.ts (`jobShare`, `openWorkers`, `unplacedRates`, `arrivals`), src/core2/modules/jobs.ts (`hireCounted`, `openCountedSeekers`), src/core2/residents-economy.ts (`addCountedJob`), src/core2/modules/residents.ts (`startRegionalWork`, `stopRegionalWork`, `householdIncome`), src/core2/modules/world-panels.ts (`townJobsPanel`), scripts/dev-tests/vitals.ts, src/bench/ui/dev-watch.mjs

**Notes.** From the Fable audit, Pillar 7. Measured there: a 19-year run of Wickliffe, Oklahoma with readings each year, the same world's jobs split by household, its first year again with every household record open, then the world run twice for three years (as it is, and with the share cleared monthly), and the same pair in Frankfort, South Dakota. The audit did not separate how much of the growth in household records (2,339 at the opening to 3,651 after a year) was arrivals and how much was regrouping, and did not look up which place each of the three place records is; its call is that neither changes the finding. It changed no game code; its call on the fix is the one above, and "the two-world test in pillar 7 is the acceptance check, and it is Sonnet work". Read on main, Nov 10 (helper): `hireCounted` calls `addCountedJob`, which adds the job and the wage and never touches `unplacedWorkers`; `startRegionalWork` adds the record's whole weight to the share for one hire; `arrivals` sets a newcomer's share from `unplacedRates`, the place's share per open adult that day, so a place already above one job per adult hands that rate to everyone who moves in. The tool that reads these counts (`scripts/dev-tests/vitals.ts`) is the one that showed the owner "more people working, less poverty" on November 8, so its long-run readings are not evidence until this lands. Related: `world-county-opens-almost-jobless-in-the-counts` (the opening side of the same counts), `people-unplaced-outside-employer` (open: gives commuting workers an employer on the books, which would also tie each share to a person), `core-counted-household-jobs-in-step` (done: the household's job list follows hires).

Released (2026-11-10): Waits on PRs 8157 and 8158, still open; claimed by hand by mistake. Continue on branch claude/pool-jobs-counted-household-job-share-runs-away.
