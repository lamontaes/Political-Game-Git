---
id: gov-staff-posts-as-data
title: "An officeholder's staff posts (aide, scheduler, press secretary, chief of staff) are data rows the staff engine reads"
area: gov
kind: feature
priority: 3
size: M
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

**What.** Staff today is one free-text role, so there is no post to ask someone to fill and nothing to vary the ask scene by. Each office kind should list its staff posts with pay and duties as research rows. The player then asks someone for a post the way a running mate is asked. Seen: the office's staff list and the ask-to-serve scene.

**Cause.** Found in code: `hireStaff` (src/core2/modules/staff.ts) takes a free-text role, so an aide has no post to vary the ask-to-serve scene by and no pay or duties of its own (brief J report, Nov 14).

**Fix.** Add a research table of staff posts by office kind (role, pay band, what the post does), read by `staffCandidates` and `hireStaff`; the player's hire becomes an ask that plays the serve-sought scene with the post as its seat.

**Time box.** 4 hours for one sonnet session.

**Rules.** No dice: an answer comes from the person's record. One rule, all 56 places.

**Done when.** A second session, in a drawn place with a seed it did not choose, plays it in the running game: Holding a council or mayor seat in a drawn place, the player sees the staff posts listed by name, asks someone for one, the scene plays, and a yes seats them on the post row by record id.

**Waits on.** nothing.

**Files.** src/core2/modules/staff.ts, src/core2/data/, src/bench/
