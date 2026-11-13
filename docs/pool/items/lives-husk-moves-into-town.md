---
id: lives-husk-moves-into-town
title: A relative living elsewhere can move into the played town, arriving as a counted household
area: core
kind: stopgap
priority: 2
size: M
status: open
standard: 2
claimed-by:
branch:
pr:
after:
blocked-on:
lead: lives
model: sonnet
effort: medium
root: design-one-model-two-tiers
milestone: M7
source: stand-in triage Nov 10; stopgap SG-LIVES-elsewhere-not-into-town
---

**What.** A relative or acquaintance who lives elsewhere never moves into the played town today: their move skips any destination that is one of the town's full-detail places. Make a move that lands in the played town arrive through the counted-moves arrival path as one counted household, kept as counts until the player meets them. Then a relative's move to town is something the player can hear about and meet, instead of being impossible. Seen: in the news of a relative arriving and in the town's household and population counts.

**Cause.** Found in code: src/core2/modules/moves.ts, function destinationFor, where `open` refuses any played-town place for a person in the inactive tier and the stopgap SG-LIVES-elsewhere-not-into-town is recorded (line 771).

**Fix.** In destinationFor, stop refusing the played town. When the chosen destination is a place of the played town, hand the move to the counted-moves arrival queue (the `arrivals` step in src/core2/modules/counted-moves.ts) as one household with the person's age band, so the town's counts, voter groups and payrolls take it like any other arrival; keep the person's id so a later fill-in returns the same person with their record. Do not add a second arrival writer. Clear the register row and delete the `open` filter and the comment.

**Time box.** 4 hours for one Sonnet session.

**Rules.** One model, two tiers: the arriving household is read by every engine with the same rule as a counted group of that size. No dice: the destination still follows the relative's tie and the county's flows, never a roll. Wire to the world: prove money and people move through the counted path. Speed: nothing scans every husk daily; it uses the monthly review already there.

**Done when.** A second session, in a drawn place and seed it did not choose, runs two played years of buildBenchWorld and finds at least one relative of the player's household who moved in, by record id in the move and arrival records, counted in the town's residents and voter groups, and a talk with them after a fill-in matching that record. `npm run speed:year` stays within 20% of its base.

**Waits on.** Nothing.

**Files.** src/core2/modules/moves.ts, src/core2/modules/counted-moves.ts, src/core2/data/stopgaps/lives.json

**Notes.** Triage Nov 10: may not stay at early access under M7 unless the CTO accepts it as a marked limit.
