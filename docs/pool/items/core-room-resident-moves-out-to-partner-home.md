---
id: core-room-resident-moves-out-to-partner-home
title: "A room resident can move out into a partner's own home"
area: core
lead: lives
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after:
source: coordinator, Nov 14, with #9252
claimed-at:
standard: 2
model: opus
effort: medium
root: none
---

**What.** When one of a couple lives in a room (a dorm, barracks or other quarters) and the other has a home of their own, the one in the room should be able to move out into that home. Since #9252, `movingOrder` returns nothing while either of them is in a room, so neither is asked and nobody moves, and the couple stays at dating for as long as the resident stays in the room. Seen: a couple's stage on the family screen and the move-in question to the player, which a dorm resident with a partner never gets.

**Cause.** Found in code: `movingOrder` in `src/core2/modules/partnerships.ts` treats a room on either side as "nobody can move", although only moving into a room is impossible; a resident leaving the room is the institution's own discharge, which `src/core2/modules/moves.ts` already handles for residents who leave (`inGroupQuarters`).

**Fix.** Let the resident be the mover and the partner's home the host: allow the room resident to leave into the partner's household through the household writer, by the discharge rule the moves module already uses, and keep refusing a move into a room.

**Time box.** 4 hours for one opus session.

**Rules.** One model, two tiers. No dice. No new stopgap. Pinned place and seed in the test: not red by draw.

**Done when.** In a played world at Storrs, Connecticut (a drawn place for the dorm case), a test stages a resident of a room with a partner who has a home of their own and shows the resident moving into that home, the room losing its member and the couple moving to living-together by the stage machine, by record id; a second session sees the same couple in the running game.

**Waits on.** #9252.

**Files.** src/core2/modules/partnerships.ts, src/core2/modules/moves.ts, src/core2/group-quarters-partner.test.ts

**Notes.** Filed by hand by the group-quarters thread, on the coordinator's ruling.
