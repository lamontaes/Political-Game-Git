---
id: play-local-races-on-screen
title: "Politics → Campaigns lists every local race in town with who filed for it"
area: play
kind: feature
priority: 2
size: S
status: claimed
claimed-by: play-first/play-local-races-on-screen
pr:
blocked-on:
source: Oct 25 pool audit, on-screen pass (from elections-local-races-too-uncontested)
lead: play-first
milestone: play-first
claimed-at: 2026-10-26T08:26:28.006Z
---

**What.** The candidacy engine decides who runs for each council, mayor and county seat, and elections-local-races-too-uncontested is fixing how many do. The player cannot see any of it: Campaigns shows only the player's own race, so an empty or one-name race is invisible until election night. Add a Local races block to Politics → Campaigns that lists each seat on the town's next ballot with every filer by name, read from the filing records, and says Unopposed or No one has filed where that is the record.

**Rules.** Serves LAW.md §11, The world on screen makes sense. Wire to the world: every name and every count comes from the filing records by id, not from a summary table. Ask why: when the screen has nothing to show, it says why in plain words, never a code or an empty box.

**Done when.** In a drawn place on the bench, after the filing deadline of the first local election, Politics → Campaigns lists every local seat on the ballot with each filer's name and an Unopposed mark where one filed, matching the filing record ids in a test, shown by a screenshot with the place and seed named. The owner plays it: he sees it on Politics → Campaigns in his own game without opening dev mode.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Before an election, Campaigns lists each local seat in your town and who is running for it.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/campaign.ts, src/bench/play.mjs, src/bench/data/controls.json

**Notes.** Filed by the Oct 25 pool audit: elections-local-races-too-uncontested's Done when names no screen. Build the screen against what the engine gives today; when the engine side is thin, the screen says so in plain words. An engine change stays with elections-local-races-too-uncontested (needs-from in the handoff line).
