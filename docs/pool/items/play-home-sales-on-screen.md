---
id: play-home-sales-on-screen
title: "News lists homes sold in town and the price they went for"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Oct 25 pool audit, on-screen pass (from world-home-turnover)
lead: play-first
milestone: play-first
---

**What.** Homes in a played town are almost never bought or sold, and world-home-turnover is building the sales. Even when one sells the player cannot tell. Add a short Homes sold line to the town's news each month with the street, the price and whether the buyer is new to town, read from the sale records, and a Journal line when someone the player knows buys or sells.

**Rules.** Serves LAW.md §11, The world on screen makes sense. Wire to the world: every listed sale is a sale record with its buyer and seller by id. Ask why: when the screen has nothing to show, it says why in plain words, never a code or an empty box.

**Done when.** In a drawn place on the bench, over a played year with any sale on record, News lists each month's sales matching the sale record ids in a test, and a known person's sale gets a Journal line; with no sale it says none sold, shown by a screenshot with the place and seed named. The owner plays it: he sees it on News in his own game without opening dev mode.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The news tells you which homes in town sold and for how much.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/story.ts, src/bench/play.mjs

**Notes.** Filed by the Oct 25 pool audit: world-home-turnover's Done when names no screen. Build the screen against what the engine gives today; when the engine side is thin, the screen says so in plain words. An engine change stays with world-home-turnover (needs-from in the handoff line).
