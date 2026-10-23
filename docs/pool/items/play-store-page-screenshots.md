---
id: play-store-page-screenshots
title: "Store page screenshots."
area: play
kind: feature
priority: 2
status: done
claimed-by: claude/play-store-shots-election-night
pr: #4795
blocked-on:
milestone:
source: "docs/archive/2026-10-23/coordination/play.md line 138 (unchecked checklist line)"
claimed-at: 2026-10-16T18:55:23.695Z
---

**What.** Checked against main on Oct 16: `src/bench/store-shots.mjs` exists, but election night prints the exit poll and turnout as raw pairs with typed labels and has no unopposed-race handling. Next: Word the exit-poll line through the English engine and mark unopposed races. The player would see it as a choice among people, never a form.

**Rules.** No hand-written player text: button names and election-night lines come from the English engine, never typed for the shot; Replace, never layer: no staged or edited screenshot stands in for real play; An effect is a read, not a record: each shot is a real `/play` screen reading engine records; One rule, all 56 places: the towns are drawn from all 56 and named in the PR body; This is a game, not a spreadsheet: no mechanic is added for a shot; Placeholders: the capsule art and any missing backdrop are registered stopgaps; American English: captions follow the spelling sweep.

**Done when.** Election night in a drawn town (buildBenchWorld, seed named in the PR body) shows contested counts and a worded exit-poll line by record id, an unopposed race is marked as such, and lint passes on store-shots.mjs. The owner plays it: Word the exit-poll line through the English engine and mark unopposed races.

**Files.** src/bench/store-shots.mjs, src/bench/play.mjs, docs/store/steam-page-draft.md, art/backdrops/manifest.json

**Notes.** Checklist line from play.md; verify against main before starting.
Absorbs play-store-screenshots-by-friday-in-progress (second run of 19 shots, seeds store-e and store-f, as of 2026-10-15).
