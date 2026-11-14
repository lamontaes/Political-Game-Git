---
id: office-vote-row-has-no-bill-name
title: 'A vote row in What you have done is titled only "VOTE" and never says which bill'
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: none
source: "Account lead T56, Nov 14, 2026, from the Words lead's read of #9126 and its Your office screens (screens absent-row.png and adjourned-row.png)"
checked:
claimed-at:
---

**What.** Each vote the player cast, or missed, reads \"FEBRUARY 4, 2025 · VOTE\" and then \"Absent: you did not attend\" or \"Yes\". Four rows on one day look alike and none names its ordinance. Seen: Politics, then Your office, in the screens at /mnt/project-files/t56/heber2/ (Potter Lake, Wisconsin, seed fb9b371a2c260c1e5bd2ea80924b870a320f30742d81a7daca8fe7535f0c943d).

**Cause.** Found in code: src/bench/play.mjs prints `controls.actions[a.kind]` (\"Vote\") as the row title; the act keeps `recordId` (the bill) but the row never reads the bill's title.

**Fix.** Design: the title is the bill's real name through the bill title record (`billTitleOf`, as the meeting's items use), with the date; the vote or absent line stays as it is.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** No hand-written player text in code; words come from controls.json or the English engine, with the Words lead's read.

**Done when.** A second session plays a council member in a drawn place, on main, switches meetings Off or Adjourns with items, and each vote row in What you have done names its ordinance (for example \"Ordinance 2025-6\"), so two rows on one day differ, shown by a screenshot of Your office in the played world.

**Waits on.** Nothing.

**Files.** src/bench/office.ts, src/bench/play.mjs

**Notes.**
