---
id: gov-appointed-citizen-boards-missing
title: "No town has an appointed citizen board (planning, zoning, library, parks), so the owner's first-year road of serving on one has nothing to serve on"
area: gov
kind: feature
priority: 2
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: fable
effort: high
root: rc10-screens-keep-own-facts
source: owner's Desk answer, Nov 16, 2026 ("Work for someone else's campaign, a party committee or an appointed board until a race opens"), crew list issue 9747 item 3a; found by the Blockers lane while building road 3a-4
checked:
---

**What.** The owner's answer for a player with no race open includes serving on an appointed board. No town in the game has an appointed citizen board: the only appointed town posts are paid department heads. There is nothing for a player to ask to serve on, and no sittings for one to attend.
Seen: Beesleys Point, New Jersey (seed 1c0c38ab-cccf-45f2-943d-b108847e2981), whose government lists only elected seats and department heads.

**Cause.** Found in code: src/core2/modules/executive.ts `townPosts` reads data/research/executive/executive-powers-2026.json `local`, which lists only department heads by form of government, and src/core2/data/offices/bodies.json holds no advisory or quasi-judicial body kind.

**Fix.**

1. Research the boards a town of each form keeps (planning commission, zoning board of appeals, library and parks boards), their sizes, terms and who appoints them, into the executive research file, SOURCED.
2. Add them as body rows the one body engine reads (src/core2/data/offices/bodies.json), with appointed seats filled at the opening by the appointer's own ranking (`appoint` in src/core2/modules/executive.ts) and sittings on the office-day calendar.
3. The player asks to be considered for an open seat; the appointer ranks them by the same reasons; a first rank is an offer the player answers in a scene, never an appointment made for them (owner, Oct 14).

**Time box.** 16 hours for one top-model session, one board kind per pull request. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Research before building: the boards a real town keeps, their sizes, terms and appointers come from sourced research, read by the one body engine as data rows.

**Done when.** A second session plays a drawn place it writes down with its seed, asks to serve on its planning board, is offered a seat in a scene, says yes, and attends a sitting where the board votes on an item.

**Waits on.** Nothing.

**Files.** data/research/executive/executive-powers-2026.json, src/core2/data/offices/bodies.json, src/core2/modules/executive.ts, src/core2/modules/legislature.ts

**Notes.** Filed by the Blockers lane, Nov 17. The road was 3a-4 in the plan on #9747; the CTO decides who builds it and when.
