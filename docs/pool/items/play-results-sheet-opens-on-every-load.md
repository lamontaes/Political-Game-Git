---
id: play-results-sheet-opens-on-every-load
title: "The Election Night sheet opens again every time the play page loads, months after the count"
area: play
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-play-results-sheet-opens-on-every-load
pr: #8495
after:
blocked-on:
standard: 2
lead: play-first
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:23:03.066Z
---

**What.** Loading the play page opened the Election Night sheet over the day whenever the player's town had any past result, even two months after the count (seen in White Sulphur Springs, Montana, 3080050, place seed e6253d7d132141ef79226210a85a474e90a1d2bb2d5ea41a69c63b9bfdb96035, on January 3, 2026, showing the November 4, 2025 results and hiding Day and Week until closed). The original cause (`seenResults` in the page) is gone, but the sheet can still reopen months after the count: the election-night route returns the newest night's race with no age limit and suppresses it only through a set the server keeps in memory. The sheet should open only on the night of a new count, and the watched mark should outlive a restart.

**Cause.** Found in code: `electionNight` in src/bench/election-night.ts (line 247) returns the newest night's race with no limit on its age, and the `/api/election-night` route in src/bench/handler.ts (line 1515) hides it only when `state.nightsWatched` (line 163, an in-memory set) has it, so a restart or a reload of a saved life reopens it.

**Fix.** Return the night only when the record's date is the player's day (or within the day after the count), and keep the watched mark in the life's own state instead of the server's memory set; if the life state has no place for it, register the memory set as a stopgap.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: whether a result is new comes from the record's own date against the player's day, not from what the page happened to see. One rule, all 56 places: the same rule for every place's results. No hand-written player text: the sheet shows record data only and nothing here adds words to it.

**Done when.** A second session (not the builder) starts the bench in a drawn place (place and seed named), plays through an election night, closes the sheet, then reloads the page and restarts the bench server the next day and a month later: each time the page opens on the day with Day and Week showing and no Election Night sheet, and the sheet still opens on its own on the night of a new count. A test over the route covers an old night and a new night. Screenshots at 1440x900 of each, with the place and seed under them.

**Waits on.** Nothing.

**Files.** src/bench/election-night.ts, src/bench/handler.ts, src/bench/play.mjs

**Notes.** TODO
