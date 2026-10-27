---
id: play-governor-races-on-screen
title: "Election night shows the governor races in other states after the player's own"
area: play
kind: feature
priority: 2
size: S
status: done
claimed-by: play-first/play-governor-races-on-screen
pr: #6159
blocked-on:
source: Oct 25 pool audit, on-screen pass (from gov-world-races-run-no-governors)
lead: play-first
milestone: play-first
claimed-at: 2026-10-26T07:56:34.497Z
---

**What.** Thirty-five states elect a governor in November 2026, and gov-world-races-run-no-governors makes the world run them. Election night shows the player's own races and nothing of the country. After the player's own contests, add a Nation page with each governor race's winner, party and margin, read from the race records, so the night feels like a national election.

**Rules.** Serves LAW.md §11, The world on screen makes sense. Wire to the world: each result is a race record with its tally by id. Ask why: when the screen has nothing to show, it says why in plain words, never a code or an empty box.

**Done when.** In a drawn place on the bench, on the night of the November 2026 general election, the results sheet shows a Nation page listing every governor race on record with winner and margin matching race record ids in a test, shown by a screenshot with the place and seed named. The owner plays it: he sees it on the election night results in his own game without opening dev mode.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** On election night you also see who won the governor races around the country.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/results.ts, src/bench/play.mjs

**Notes.** Filed by the Oct 25 pool audit: gov-world-races-run-no-governors's Done when names no screen. Build the screen against what the engine gives today; when the engine side is thin, the screen says so in plain words. An engine change stays with gov-world-races-run-no-governors (needs-from in the handoff line).
