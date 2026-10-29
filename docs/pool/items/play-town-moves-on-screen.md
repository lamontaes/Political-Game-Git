---
id: play-town-moves-on-screen
title: "Who you are shows your town's population and how many moved in and out this year"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Oct 25 pool audit, on-screen pass (from world-town-net-moving-negative)
lead: play-first
milestone: play-first
claimed-at:
---

**What.** The moves engine moves households in and out of the town every month, and world-town-net-moving-negative is fixing a town that shrinks too fast. The player never sees the town's size change. Show the town's population under its name on Who you are, with this year's arrivals and departures, and let News print a line when someone the player knows moves away or a new family moves onto the street, read from the move records.

**Rules.** Serves LAW.md §11, The world on screen makes sense. Wire to the world: the counts are sums of move records and the town's people, not a parameter. Ask why: when the screen has nothing to show, it says why in plain words, never a code or an empty box.

**Done when.** In a drawn place on the bench, after a played year, Who you are shows the town's population and the year's arrivals and departures equal to the move records counted in a test, and a known person's move appears in News by record id, shown by a screenshot with the place and seed named. The owner plays it: he sees it on Who you are and News in his own game without opening dev mode.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Your town's population and who moved in or out this year show on Who you are and in the news.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/card.ts, src/bench/story.ts, src/bench/play.mjs

**Notes.** Filed by the Oct 25 pool audit: world-town-net-moving-negative's Done when names no screen. Build the screen against what the engine gives today; when the engine side is thin, the screen says so in plain words. An engine change stays with world-town-net-moving-negative (needs-from in the handoff line).

Oct 29 (CTO, second account): claim released; the session that held it ended with the Oct 19 to 29 crews. Branch `play-first/play-town-moves-on-screen` is kept; claiming this item takes it over.
