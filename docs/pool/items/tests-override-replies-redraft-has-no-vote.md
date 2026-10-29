---
id: tests-override-replies-redraft-has-no-vote
title: "The override replies test fails where the refiled bill leaves the member no floor vote (Hunker, Pennsylvania)"
lead: laws-effects
area: laws
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/override-replies-refiled-floor
pr: #6499
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T02:44:59.471Z
---

**What.** src/core2/override-replies.test.ts fails on main at 7f526c5105 with GOLDEN_PATH_SEED=db1624b0ba2f1205: in Hunker, Pennsylvania (4236288), the sponsor refiles the bill after the failed override and holds its vote at once, but member official:term:seat:US-PA:lower:157:0:2025-01-20 has no vote row on bill:office:US-PA:legislature-lower:2025-03-21:…:34. The test assumes the refiled bill reaches a floor roll call in that member's chamber the same day; in a chamber with committees the refiled bill can end before the floor, so the member never votes on it. The same test passes on the seeds it was written against, so the fault is the assumption, not the reply.

**Rules.** Ask why: name by record id how the refiled bill ended before the member voted (committee held, text blocked) before changing the test. Never loosen the check to get green: the member's vote on a refiled bill must still cite the reply wherever it reaches the floor.

**Done when.** override-replies.test.ts passes on that seed on main and on three fresh seeds named in the PR body, the cause named by record id, and a refiled bill that reaches the floor still has the member's vote cite the reply.

**Files.** src/core2/override-replies.test.ts

**Notes.** Mine (laws-and-effects lead, #6365). Found Oct 27 23:30 while running the ask-before-the-roll branch's tests; fails identically on main.
