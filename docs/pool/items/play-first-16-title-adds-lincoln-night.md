---
id: play-first-16-title-adds-lincoln-night
title: "The title's scenes include the Lincoln Memorial at night"
area: art
kind: bug
priority: 1
size: S
status: in-pr
claimed-by:
pr: #6109
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** The owner's title ruling (Oct 8) names recognizable national scenes: the White House at night, the Lincoln Memorial, a rally, the convention. A Firefly painting of the Lincoln Memorial at night waits in art/incoming/firefly (title-lincoln-night-a__215378c3.jpg), and the title's scene list (src/bench/title.ts TITLE_SCENES) has no Lincoln Memorial. This item imports the painting through the asset pipeline and adds it to the title's rotation.

**Rules.** Serves LAW.md §1, Screens and menus. This is a game, not a spreadsheet: the title is a full-window national scene, never a panel. Replace, never layer: the imported file leaves art/incoming/firefly in the same change.

**Done when.** On the title in a drawn place's build, the Lincoln Memorial at night shows full-window in the rotation, imported with its provenance, shown by a full-window screenshot for the owner's yes.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The title screen's rotation includes the Lincoln Memorial at night, full-window, with the menu over it.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/title.ts, art/incoming/firefly/index.json

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Follow the asset-scene-admission skill. A screen's look merges only on the owner's yes to its screenshot (Oct 14). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).

Sent back 2026-10-25 from PR #6109 (branch play-first/play-first-16-title-adds-lincoln-night): native Firefly source1376x768 was enlarged to1672x941, violating asset admission no-raster-enlargement rule; obtain sufficient native source and non-enlarging derivative; finish on that branch, merge main into it first.
