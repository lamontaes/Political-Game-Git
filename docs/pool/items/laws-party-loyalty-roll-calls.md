---
id: laws-party-loyalty-roll-calls
title: "Party loyalty calibrated from each legislature's public roll calls"
area: laws
kind: research
priority: 2
status: in-pr
claimed-by: claude/political-game-pool-yucp92-rr
pr: #5521
blocked-on:
milestone:
source: "owner rulings, Oct 15 afternoon (docs/coordination/OWNER-DECISIONS.md)"
claimed-at: 2026-10-20T04:54:57.260Z
---

**What.** State legislators' party loyalty is set from the Shor-McCarty dataset, which is non-commercial and cannot ship. The owner's Oct 15 ruling lets it calibrate the state-chamber party-loyalty parameter as one input weighted against roll calls, with nothing shipped and no citation. The replacement calibrates each chamber from its own public roll-call records. A player would see members of each chamber vote with or against their party the way that chamber really does.

**Rules.** Research before building: real roll calls calibrate the parameter and never decide one member's vote. No dice: a vote comes from the member's traits, principles, relationships and the bill, with loyalty one input. One rule, all 56 places: each chamber's value comes from data, tagged SOURCED with citation. Wire to the world: the legislature engine reads the parameter at the vote.

**Done when.** Owner confirms the route, then in a one-year played world (buildBenchWorld, a drawn state from all 56, seed named) a chamber vote record id shows loyalty read from the calibrated parameter, and each chamber's row is tagged SOURCED in the parameter table. The test in src/core2/voting.test.ts covers the read and a data test covers the sourcing. The owner plays it: watch a party-line vote in a state that really splits that way.

**Files.** src/core2/modules/voting.ts, src/core2/data/campaigns/parameters.json, docs/coordination/OWNER-DECISIONS.md

**Notes.** Owner ruling (Oct 15): Shor-McCarty may calibrate the state-chamber party-loyalty parameter; nothing ships, no citation; one calibration input weighted against roll calls.
Sent back 2026-10-20 from PR #5159 (branch claude/political-game-pool-l9cym2): Morning check failed because stopgap row SG-LAWS-state-party-loyalty-target was deleted from stopgaps.json instead of resolved; finish on that branch, merge main into it first.
