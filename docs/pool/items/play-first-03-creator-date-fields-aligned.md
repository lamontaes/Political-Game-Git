---
id: play-first-03-creator-date-fields-aligned
title: "The creator's month, day and year line up"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by:
pr: #6791
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** The owner's read of the playtest screenshots: the creator's month, day and year line up. In the v0.22.10 creator the birthday fields sit unevenly and the first-name field has no visible box until filled. This item lines up the three date fields and gives every creator field its box.

**Rules.** Serves LAW.md §10, The owner's read of the Oct 24 screenshots. This is a game, not a spreadsheet: the creator looks made, with fields that line up like a finished game's. Replace, never layer: the date row's old rules in play.css are removed.

**Done when.** In the creator on the bench at 1440×900 in a drawn place's new game, month, day and year share one top and bottom edge and every text field shows its box empty or filled, shown by a screenshot.

**Time box.** 1 hour; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** In the creator, month, day and year sit on one line at one height, lined up with the fields above them.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.css, src/bench/play.html

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).

Merger3,October26: bench implementation and native pointer/keyboard acceptance reviewed in PR6087 under play-creator-date-fields-ui-implementation. This original item remains open for the installed-build check under the October25 owner ruling; no owner screenshot is requested as a PR merge gate.
