---
id: play-first-03-creator-date-fields-aligned
title: "The creator's month, day and year line up"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The owner's read of the playtest screenshots: the creator's month, day and year line up. In the v0.22.10 creator the birthday fields sit unevenly and the first-name field has no visible box until filled. This item lines up the three date fields and gives every creator field its box.

**Rules.** This is a game, not a spreadsheet: the creator looks made, with fields that line up like a finished game's. Replace, never layer: the date row's old rules in play.css are removed.

**Done when.** In the creator on the bench at 1440×900 in a drawn place's new game, month, day and year share one top and bottom edge and every text field shows its box empty or filled, shown by a screenshot.

**Files.** src/bench/play.css, src/bench/play.html

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
