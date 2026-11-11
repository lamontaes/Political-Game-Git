---
id: release-nightly-twenty-year-game-on-main
title: "One 20-year game runs to the end on main every night, in a drawn place, and fails loudly on a crash or a nonsense world"
area: release
kind: feature
priority: 1
size: S
status: open
claimed-by:
pr: #8152
after:
blocked-on:
lead: speed
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 7, "Size of the fix: small, now")
claimed-at:
merged-at:
---

**What.** Nobody finds out that a long game is broken until someone happens to run one. Measured by the audit: a 20-year run of South Hero, Vermont (seed 9bf1ede27ce5a00e) crashed in year 12 after 16 minutes, three times the same way, on a defect that had been an open pool item since October 20 and had also stopped the crew's own run in Montpelier, Vermont in year 19. A second world, Wickliffe, Oklahoma (seed 8832429ff1e53841), did not crash and stopped making sense: the crew's own tool read 125% of adults at work after eleven years and 200% after eighteen. The nightly run on main today plays every place for two years, so neither would have shown there. Build the small piece the audit asks for now: every night, on main, one 20-year game on a place and seed drawn that night, run to the end, which fails loudly, naming the place, the seed, the year and the record, on a crash or on a world that cannot be real (more jobs than adults, for one), so it is caught the day it lands.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Speed: the owner's bar is a country's year in under two minutes and years 97 to 100 at most 1.2 times years 1 to 4, and this run prints each year's seconds, memory and records kept beside that bar every night. One rule, all 56 places: the place and seed are drawn fresh each night from all 56 and named in the result, never a fixed town. Sliding scales and causes: the sense checks catch only what cannot happen in any world (more jobs held than adults, a negative count of people, money that does not balance); they never fail a run for leaving a real-world range. Owner, November 8: "ranges aren't targets." Owner, November 9: "I don't understand why it's taking so long to get rid of that memory problem for a 20-year run. Keep saying that it's been solved." Owner, October 29: "I want simulations to be able to go hundreds of years."

**Done when.** A second session, not the builder, checks it. The nightly workflow has run on main on a schedule for two nights, each in a different drawn place, and each run's summary names the place, the seed, every year's seconds, memory and records kept, and the result of each sense check. They run the same command by hand on the audit's two worlds as named repros: South Hero, Vermont, seed 9bf1ede27ce5a00e, where it must stop in the year of the crash and print the place, seed, year and failing record while that crash is unfixed, and Wickliffe, Oklahoma, seed 8832429ff1e53841, where it must fail on more jobs than adults while that defect is unfixed. A red night opens or updates one pool item with the place, seed and year, and messages the red-main owner. Then in the running game (`npm run bench`, play at `/play`), a new game on the failing night's place and seed, advanced with dev mode's Run toward the failing year, shows the same condition on the Metrics tab or stops the same way, with a screenshot, so the night's result is something a player would meet. A test feeds the sense checks a made-up world with more jobs than adults and fails if they stay silent. The owner plays it: the morning after a change breaks year 12 of a long game, the report he reads says so, with the town and the year.

**Files.** .github/workflows/all-places-nightly.yml (the existing nightly, two years in every place, to sit beside), scripts/speed-years/run.ts (`npm run speed:year`), scripts/dev-tests/drift-played.ts, scripts/dev-tests/vitals.ts (the readings the sense checks start from), package.json, .agents/skills/heavy-runs/SKILL.md

**Notes.** From the Fable audit, Pillar 7: "Small, now: fix the year-12 crash and run one 20-year game to the end on main every night, so a crash or a nonsense world is caught the day it lands." The crash itself is `core-press-staff-counted-job-not-resident` (claimed, priority 1) and is not part of this item; the nonsense world is `jobs-counted-household-job-share-runs-away`. The audit's South Hero run took 16 minutes to reach year 12 and its Wickliffe run took 51 minutes for 19 years on a shared machine, with memory after cleanup reaching 2.9 GB, and the crew's Montpelier, Vermont years took 9 to 19 minutes each with memory at 5.5 GB, so the job needs a time limit and a heap size set from `heavy-runs`, and a run that hits the time limit before year 20 is a red night, not a pass. The audit did not measure how many seeds reach the crash; its call is that every 20-year game is exposed. Until the vital-statistics readings are fixed, the sense checks should count jobs from the job records themselves and say so. Related: `core-speed-large-town-year-heap-nightly` (done: the every-place nightly's heap), `core-long-run-tables-grow-with-history` (open: the growth this run will report each night).

Not seen in the game (2026-11-11, second-session-2): none (workflow runs list), seed none, main 67947ae8: GitHub lists zero runs of twenty-year-nightly.yml on main, so no nightly has run for two nights and no summary names a place and seed
