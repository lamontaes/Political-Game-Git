---
id: play-nov8-race-page-reads-the-opening-day-as-today
title: "A race's page decides whether to say 'filing opens' by the day the game was loaded, not today's date (owner's Nov 8 playtest, Manchester, Connecticut)"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6: the 72 points of the Nov 8 playtest, point P18, partly fixed)
---

**What.** The owner, Nov 8, about 2:10 p.m. Eastern (v0.94.0, Manchester, Connecticut; docs/coordination/playtest/2026-11-08-1-verbatim.md): "So let's see, I go to elections. And I mean, I can't... But like I go to elections and I can't do anything. Like I don't know what to do." And in the same sitting: "There's one date and there's one time. One date, one time." Part of this is fixed on main: a race's page now lists the day filing opens and says plainly why the player cannot file when a rule stops them. What main still does, read in code on Nov 10, not measured: in `campaigns()` in `src/bench/play.mjs` the "filing opens" row is shown when `race.filingOpens > me.date` and its year is worded against `me.date` (lines 4320 and 4325). `me.date` is set once when the life is loaded (lines 5437, 6024 and 6171); the game's date is `today()` (line 132), which every other row on the page uses. So in a sitting that started before filing opened, the page goes on saying filing opens on a day already past, beside a File for it button; and from the second year on, the year in that row is worded against the wrong year. Fix the class: no screen reads `me.date` as today; the one date is the clock's.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the screen reads the world's one date and keeps no copy of its own; `me.date` used as today is a second version of a fact. Replace, never layer: every read of `me.date` as the current day is replaced by the one date, and the field is removed if nothing else needs it. Owner, Nov 8, 2:10 p.m. (OWNER-DECISIONS, the playtest of v0.94.0): "One date, one time." The player-screen-text skill: "The clock, the light in the room and the narration agree."

**Done when.** A different session starts the bench (`npm run bench`), starts a new game in a drawn place where a local race's filing has not opened yet (place, seed and the race's contest record id named in the proof), opens Politics, then Elections, opens that race and takes a screenshot at 1440×900: the dates must list the day filing opens. Without reloading, it plays with Week until the day after filing opens and takes a second screenshot of the same race: the "filing opens" row must be gone, the deadline and election day must remain, and File for it must show if the player may file. It then plays into the next calendar year and screenshots a race whose election is that year: every date's year must be worded against the current year. A search of `src/bench/play.mjs` must find no comparison of a date with `me.date`. The same check is then run in Manchester, Connecticut, the owner's place on Nov 8 (no seed was kept), as the named repro. The owner plays it: he opens a race and the dates on it are right for the day he is on, in June as in January.

**Files.** src/bench/play.mjs, src/bench/government.ts

**Notes.** From the Nov 8 playtest, point P18 (docs/coordination/playtest/2026-11-08-1.md) and its row in `2026-11-08-1-check.md` (Check C: "It never says when filing opens"), and the same file's "Also wrong" line under Check B: "`me.date` is also the 'this year' reference for election and government dates: wrong from 2026 on." The News date was the same defect and is fixed (the audit confirmed it in the game: "the News date now follows the world's date"); these two lines are what is left of it. The other part of P18 is not this item and is a registered stopgap: a candidate's rally to visit to learn their views (owner, Oct 28; stopgap SG-SCREENS-candidate-rally, "no engine keeps a rally as a place and a time", comment at line 4289). What to campaign on is play-issue-stances-on-screen (open) and play-nov8-candidates-stands-are-budget-lines (filed Nov 10); the campaign board is screens-campaign-board (open). Not verified: nothing here was measured in the running game on Nov 10.
