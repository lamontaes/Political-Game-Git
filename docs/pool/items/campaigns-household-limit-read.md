---
id: campaigns-household-limit-read
title: "The campaign engine reads a household limit on the candidate's own money"
area: elections
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: "scene builder A, episode spouse-stake-after-filing (docs/design/scenes/from-life/spouse-stake-after-filing.md)"
lead: effects
standard: 2
model: opus
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** After a filing, a relative whose household savings fall short of the race's length (`src/director/family-stake.ts`) talks to the player at home, and one of the player's four replies bounds the cost ("There's a line I won't cross with our savings"). Today that reply is recorded as said and as time together, and nothing reads the limit (stopgap `SG-WORDS-family-limit-unread`). The campaign engine should keep the limit as a record of what the candidate agreed to with that relative, and read it when the candidate gives their own money. Seen: your reply "there's a line I won't cross with our savings" limits what the campaign takes from your own money.

**Cause.** Found in code: src/core2/modules/campaigns.ts `contributeOwnMoney` (line 3447) reads no household limit. The comfort reply in the filing talk (src/director/family-stake.ts, src/director/purpose-scene.ts) is recorded as said and as time together, and nothing reads it (stopgap SG-WORDS-family-limit-unread, src/director/data/stopgaps.json line 412).

**Fix.** Keep the limit as a record of what the candidate agreed with that relative. When `contributeOwnMoney` goes past it, write a breach record and lower the tie with the relative. Close the stopgap in the same change.

**Time box.** 4 hours for an Opus session; if not done, push what exists and write the handoff.

**Rules.** Wire to the world: the limit must change money or a tie in a generated world, not only exist as a record. No dice: a gift past the limit is recorded as a breach by the record, and the relative's reaction follows their traits and the tie, never a chance. An effect is a read, not a record: `volunteerReason` and the closeness engine read the breach.

**Done when.** A second session, in a drawn place after a filing talk where the player answers with the comfort reply on a money stake, sees the household limit on a named record. A later `contributeOwnMoney` past it writes a breach record and lowers the tie with the relative, shown by a buildBenchWorld test that names the place, the seed and the record ids. When you promised at home to hold the line on your own savings and then spend past it, the person you promised notices, and it shows in how they treat your campaign. SG-WORDS-family-limit-unread is closed in the same change.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/director/purpose-scene.ts, src/director/family-stake.ts, src/director/data/stopgaps.json

**Notes.** Filed by scene builder A on Oct 27 as an engine item for the effects lead; the words line does not build it.
