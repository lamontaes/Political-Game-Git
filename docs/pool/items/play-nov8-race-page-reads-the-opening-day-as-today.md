---
id: play-nov8-race-page-reads-the-opening-day-as-today
title: "A race's page decides whether to say 'filing opens' by the day the game was loaded, not today's date (owner's Nov 8 playtest, Manchester, Connecticut)"
area: play
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-play-nov8-race-page-reads-the-opening-day-as-today
pr: #8469
after:
blocked-on:
standard: 2
model: sonnet
effort: low
root: rc10-screens-keep-own-facts
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6: the 72 points of the Nov 8 playtest, point P18, partly fixed)
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:22:03.512Z
---

**What.** The owner, Nov 8, about 2:10 p.m. (v0.94.0, Manchester, Connecticut): "There's one date and there's one time. One date, one time." A race's page now lists the day filing opens, but its "filing opens" row is shown by comparing against the day the game was loaded, not today. In a sitting that started before filing opened, the page goes on saying filing opens on a day already past beside a File for it button, and from the second year on the year in that row is worded against the wrong year. No screen should read the load day as today; the one date is the clock's.

**Cause.** Found in code: `campaigns` in src/bench/play.mjs shows the row when `race.filingOpens > me.date` and words its year against `me.date` (lines 4326 and 4331). `me.date` is set once when the life is loaded; the game's date is `today` (line 132), which every other row uses.

**Fix.** Replace every read of `me.date` as the current day with `today()`, delete the field if nothing else needs it, and add a check that finds no date compared with `me.date`.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the screen reads the world's one date and keeps no copy of its own. Replace, never layer: every read of the load day as today is replaced, and the field is removed if nothing else needs it. Owner, Nov 8 (OWNER-DECISIONS): "One date, one time."

**Done when.** A second session (not the builder) starts the bench (`npm run bench`), starts a new game in a drawn place where a local race's filing has not opened yet (place, seed and the race's contest record id named), opens Politics, then Elections, opens that race and takes a screenshot at 1440x900: the dates list the day filing opens. Without reloading, it plays with Week until the day after filing opens and takes a second screenshot: the filing-opens row is gone, the deadline and election day remain, and File for it shows if the player may file. It then plays into the next calendar year and screenshots a race whose election is that year: every date's year is worded against the current year. A search of src/bench/play.mjs finds no comparison of a date with `me.date`. The check is repeated in Manchester, Connecticut, the owner's place on Nov 8 (no seed was kept), as the named repro.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/government.ts

**Notes.** From the Nov 8 playtest, point P18 (docs/coordination/playtest/2026-11-08-1.md) and its row in `2026-11-08-1-check.md` (Check C: "It never says when filing opens"), and the same file's "Also wrong" line under Check B: "`me.date` is also the 'this year' reference for election and government dates: wrong from 2026 on." The News date was the same defect and is fixed (the audit confirmed it in the game: "the News date now follows the world's date"); these two lines are what is left of it. The other part of P18 is not this item and is a registered stopgap: a candidate's rally to visit to learn their views (owner, Oct 28; stopgap SG-SCREENS-candidate-rally, "no engine keeps a rally as a place and a time", comment at line 4289). What to campaign on is play-issue-stances-on-screen (open) and play-nov8-candidates-stands-are-budget-lines (filed Nov 10); the campaign board is screens-campaign-board (open). Not verified: nothing here was measured in the running game on Nov 10.
