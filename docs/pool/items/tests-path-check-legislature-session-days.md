---
id: tests-path-check-legislature-session-days
title: "path-check stops in a legislature: a passed bill waits on its executive, a hearing holds the day, and the law's date is out of sight"
area: play
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/path-check-session-days
pr: #4962
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T19:23:42.569Z
---

**What.** In Washington, D.C. (seed swa26d59c4) the headless golden-path check ended at step 8 though the council's bill was enacted 11 to 1. Three things in `src/bench/path-check.ts`, none in the game: (1) a passed bill waits on its executive (the mayor signs after the vote) and an enacted law is recorded on its own date, so the check looked for the law too early and never lived past its date; it now waits a week at a time, up to five months, for the law to exist; (2) a state legislator's own committee hearing (`office-day.own-hearing`) holds the clock, which `liveUntil` never released, so the day stopped on 2027-01-05 400 times over; it now lets the character do the waiting entries on their own choice (`waitingEntries`, `actOn`); (3) the summary now says when the bill's law takes effect, when the character's day ended, and, if the clock stopped short, what held it.

**Rules.** Test tooling only: nothing in the game changes. No dice. One rule, all 56 places: the check names no place.

**Done when.** In the played world (`buildBenchWorld`, the drawn place Washington, D.C., seed swa26d59c4) `GOLDEN_PATH_SEED=swa26d59c4 node --import tsx src/bench/path-check.ts` reports steps 3 to 10 and prints when the law takes effect and when the day ended, with the record ids of the bill and its law.

**Files.** src/bench/path-check.ts

**Notes.** Measured Oct 17 (claude): D.C. reached step 10 after these changes (612 s); before, step 8. The game side of the same run (a unicameral speaker setting the agenda) is play-unicameral-speaker-sets-agenda, merged in #4956.
