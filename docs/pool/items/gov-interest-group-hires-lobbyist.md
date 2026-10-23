---
id: gov-interest-group-hires-lobbyist
title: "An employers' group hires a lobbyist who remembers each member's votes"
area: gov
kind: stopgap
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/modules/interest-groups.ts uses a member business's owner (done Oct 19) or else the best-paid resident working for it as the group's lobbyist; the group never hires one. Make the lobbyist a hired job paid from the group's dues, filled by a person chosen for their record (government or law work, relationships with members), who keeps a memory of each member's votes and reads it when pressing. Closes SG-GOV-group-lobbyist-stand-in.

**Rules.** Wire to the world: the lobbyist's pay moves from the group's account. No dice: hiring reads applicants' records. The owner's Oct 20 money ruling binds: debt makes an official a lobbyist's target, so the lobbyist reads officials' finances.

**Done when.** In a one-year run of the played world (buildBenchWorld, drawn place and seed named), an interest group's lobbyist job record, its pay posting and a pressing act that cites a member's vote memory are named by id, checked in src/core2/modules/interest-groups.test.ts.

**Files.** src/core2/modules/interest-groups.ts, src/core2/modules/jobs.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): the row SG-GOV-group-lobbyist-stand-in stays open while its only pool item is done.
