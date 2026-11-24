---
id: gov-chief-of-staff-seat
title: "A governor's or mayor's chief of staff is a seat the player fills by asking"
area: gov
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: governing
source: S6 (brief J, asking someone to serve), Nov 14 2026
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** A governor or mayor has no chief of staff today because staff has no posts. Once posts are data, the chief of staff is one row, asked for through the same scene as a running mate. The answer comes from the person's record. Seen: the office's staff list and the ask-to-serve scene.

**Cause.** Design: docs/pool/items/gov-staff-posts-as-data.md; brief J (Nov 14) lists the chief of staff as a seat with no record today; listed, not built (Account lead, 05:15Z).

**Fix.** Once gov-staff-posts-as-data lands, add the chief of staff row and let the player ask through the serve-sought scene.

**Time box.** 2 hours for one sonnet session.

**Rules.** No dice: an answer comes from the person's record. One rule, all 56 places.

**Done when.** A second session, in a drawn place with a seed it did not choose, plays it in the running game: Playing a governor in a drawn state, the player asks someone to be chief of staff and a yes seats them on the post row.

**Waits on.** gov-staff-posts-as-data.

**Files.** src/core2/modules/staff.ts
