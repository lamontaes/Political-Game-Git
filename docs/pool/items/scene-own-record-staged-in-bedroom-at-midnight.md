---
id: scene-own-record-staged-in-bedroom-at-midnight
title: "An ask that stops the day at its close is staged in the player's bedroom at midnight, with the colleague standing in it"
lead: director
area: words
kind: bug
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A scene from one of the player's own records that interrupts as the day closes is staged where the player stands at that midnight. The evening-before ask (vote-asked from a vote-ahead record, branch claude/ask-before-the-roll) shows the sponsor standing in the player's bedroom at 12:00 AM while its own narration says they catch you outside the chamber or knock at your desk. Seen Oct 27 in Fort Pierce South, Florida (bench Advanced, seed f40b8d6c2e7193a5, Adam Williamson, April 1, 2025). The scheduling rule already lists home, office and phone as the settings an own-record scene is met in (ownRecordSettings in src/director/data/situation-types.json).

**Rules.** One rule, all 56 places: an own-record scene that interrupts at the day's close is met by phone or at the office the cause names, never with a colleague in the bedroom, for every scene type that rule covers. This is a game, not a spreadsheet: the staged place, the time and the narration agree.

**Done when.** In a buildBenchWorld drawn place with a seed named in the PR body, the evening-before ask stages at the office or by phone with narration that fits it, a test checks the staged setting of every own-record scene that interrupts at midnight, and a bench screenshot at 1440x900 shows it.

**Files.** src/director/scheduling.ts, src/bench/scene.ts, src/director/data/situation-types.json

**Notes.** Found Oct 27 by the laws-and-effects lead while taking the ask-before-the-roll screenshots (docs/play-first/shots-27/ask-before-the-roll-after-ask.png).

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): twin of `integration-day-lands-on-morning-and-places-keep-hours`; close into it and carry any line it lacks there.
