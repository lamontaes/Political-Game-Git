---
id: play-first-15-mark-gap-off-player-screen
title: "Mark gap leaves the player's talk box"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/quirky-ride-vrwwz4-play-stop-02
pr: #6058
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-10-25T17:51:53.551Z
---

**What.** On the v0.22.10 release every talk box carried a Mark gap button, and pressing it sent a gap note in the background with nothing on screen. Mark gap is a developer control (src/bench/play.html line 672, `/api/talk/gap`). This item takes it off the player's screen; it stays only where dev mode is on.

**Rules.** Serves LAW.md §8, Dev-speak. No hand-written player text and no developer controls on player screens: the talk box shows replies, Say nothing and Leave. Replace, never layer: the button is removed from the player's markup, not hidden by style.

**Done when.** In a drawn place, no talk box in play shows Mark gap, and a test fails if the player's play.html renders a Mark gap control outside dev mode, shown by a screenshot of a talk box.

**Time box.** 1 hour; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** No Mark gap button in any talk box; Say nothing and Leave are the only small controls under the replies.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.html, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md). Playtest Oct 26 sitting 1 (installed v0.34.0): Mark gap still in every talk box on v0.34.0 (family talks and the filing counter). Same owner quote as above.

Oct 29 (CTO): set done; PR #6058 merged (the done flip failed while branch protection refused the flip job's push).
