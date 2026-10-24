---
id: play-stop-card-covers-rings
title: "A pending stop's card covers the ring icons, so the rings take no click until Continue"
area: play
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
after: play-stop-12-status-card-covers-menu-after-canvass
---

**What.** When a stop is pending (for example Shift ends with Continue), the card panel grows over the six ring icons and a pointer click on the Politics ring lands on the card section instead. The player must press Continue before any ring works. Seen in the PR #5533 browser run.

**Rules.** Serves LAW.md §1, Screens and menus. Wire to the world is not at stake; the screen must stay usable at a stop.

**Done when.** In a bench world drawn from all 56 (place and seed named), with a stop pending, a real pointer click on each ring opens it, shown by a Playwright run with a screenshot in the PR.

**Time box.** 1 hour; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** With a stop pending, each icon in the menu rail opens with one click, without pressing Continue first.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.css, src/bench/play.ts

**Notes.** Found by the browser run on PR #5533; screenshot defect-card-covers-rings-at-stop.png in that session. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
