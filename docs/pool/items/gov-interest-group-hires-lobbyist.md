---
id: gov-interest-group-hires-lobbyist
title: "An employers' group hires a lobbyist who remembers each member's votes"
area: gov
kind: stopgap
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: governing
standard: 2
model: opus
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** An employers' group uses a member business's owner (done Oct 19) or else the best-paid resident working for it as its lobbyist; the group never hires one. Make the lobbyist a hired job paid from the group's dues, filled by a person chosen for their record (government or law work, relationships with members), who keeps a memory of each member's votes and reads it when pressing. Closes the stopgap `SG-GOV-group-lobbyist-stand-in`.

**Cause.** Found in code: `src/core2/modules/interest-groups.ts` `lobbyistFor` (line 462, stopgap marker `SG-GOV-group-lobbyist-stand-in` at line 468) picks a member business's owner or best-paid worker.

**Fix.** Make the lobbyist a hired job paid from the group's dues, chosen from applicants' records, who keeps a memory of each member's votes and reads it (and the official's known finances) when pressing.

**Time box.** 6 hours for one opus session.

**Rules.** Wire to the world: the lobbyist's pay moves from the group's account. No dice: hiring reads applicants' records. The owner's Oct 20 money ruling binds: debt makes an official a lobbyist's target, so the lobbyist reads officials' finances. An effect is a read, not a record.

**Done when.** A second session plays a year in a drawn place (named with its seed) and sees an interest group's lobbyist job record, its pay posting from the group's account and a pressing act that cites a member's vote memory, all named by id, and the test in `src/core2/modules/interest-groups.traits.test.ts` covers it.

**Waits on.** Nothing.

**Files.** src/core2/modules/interest-groups.ts, src/core2/modules/jobs.ts, src/core2/data/stopgaps/gov.json, src/core2/modules/interest-groups.traits.test.ts

**Notes.** Oct 20 (pool feeder): the row SG-GOV-group-lobbyist-stand-in stays open while its only pool item is done. Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). A hired lobbyist paid from dues with a memory of votes; a stand-in lobbyist already meets members and the player sees the same meetings.
