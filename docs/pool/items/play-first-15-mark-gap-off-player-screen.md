---
id: play-first-15-mark-gap-off-player-screen
title: "Mark gap leaves the player's talk box"
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

**What.** On the v0.22.10 release every talk box carried a Mark gap button, and pressing it sent a gap note in the background with nothing on screen. Mark gap is a developer control (src/bench/play.html line 672, `/api/talk/gap`). This item takes it off the player's screen; it stays only where dev mode is on.

**Rules.** No hand-written player text and no developer controls on player screens: the talk box shows replies, Say nothing and Leave. Replace, never layer: the button is removed from the player's markup, not hidden by style.

**Done when.** In a drawn place, no talk box in play shows Mark gap, and a test fails if the player's play.html renders a Mark gap control outside dev mode, shown by a screenshot of a talk box.

**Files.** src/bench/play.html, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
