---
id: laws-party-loyalty-roll-calls
title: "Party loyalty calibrated from each legislature's public roll calls"
area: laws
kind: research
priority: 2
status: open
claimed-by:
pr: #5521
blocked-on:
milestone:
source: "owner rulings, Oct 15 afternoon (docs/coordination/OWNER-DECISIONS.md)"
claimed-at:
---

**What.** State legislators' party loyalty is set from the Shor-McCarty dataset, which is non-commercial and cannot ship. The owner's Oct 15 ruling lets it calibrate the state-chamber party-loyalty parameter as one input weighted against roll calls, with nothing shipped and no citation. The replacement calibrates each chamber from its own public roll-call records. A player would see members of each chamber vote with or against their party the way that chamber really does.

**Rules.** Research before building: real roll calls calibrate the parameter and never decide one member's vote. No dice: a vote comes from the member's traits, principles, relationships and the bill, with loyalty one input. One rule, all 56 places: each chamber's value comes from data, tagged SOURCED with citation. Wire to the world: the legislature engine reads the parameter at the vote.

**Done when.** Owner confirms the route, then in a one-year played world (buildBenchWorld, a drawn state from all 56, seed named) a chamber vote record id shows loyalty read from the calibrated parameter, and each chamber's row is tagged SOURCED in the parameter table. The test in src/core2/voting.test.ts covers the read and a data test covers the sourcing. The owner plays it: watch a party-line vote in a state that really splits that way.

**Files.** src/core2/modules/voting.ts, src/core2/data/campaigns/parameters.json, docs/coordination/OWNER-DECISIONS.md

**Notes.** Owner ruling (Oct 15): Shor-McCarty may calibrate the state-chamber party-loyalty parameter; nothing ships, no citation; one calibration input weighted against roll calls.
Sent back 2026-10-20 from PR #5159 (branch claude/political-game-pool-l9cym2): Morning check failed because stopgap row SG-LAWS-state-party-loyalty-target was deleted from stopgaps.json instead of resolved; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5521 (branch claude/political-game-pool-yucp92-rr): `src/core2/data/officials/state-chamber-loyalty.json:4` explicitly leaves each legislature’s own roll calls to be collected later. The existing ruling at `docs/coordination/OWNER-DECISIONS.md:245` permits the calibration input but requires it to be weighted against those roll calls; it does not waive that work. `docs/pool/items/laws-party-loyalty-roll-calls.md:20` also requires a named one-year drawn-world chamber-vote record showing the calibrated value being read, which the body does not provide. Complete the roll-call calibration and that trace, keeping SG-LAWS-state-party-loyalty-target open until its replacement is demonstrated. No further owner permission is needed for the already-ruled calibration route. Morning check blocks this head; no local gate pass is claimed.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5159 (branch claude/political-game-pool-l9cym2): The restored stopgap row and removal of owner/date notes answer the prior send-back. The remaining calibration acceptance is unmet: state-chamber-loyalty.json:4 still says each legislature's own roll calls will be collected later, while docs/coordination/OWNER-DECISIONS.md:245 requires this input to be weighted against those roll calls. No new owner permission is needed for the already-ruled route. docs/pool/items/laws-party-loyalty-roll-calls.md:20 also requires a one-year drawn-world chamber-vote record ID showing the calibrated parameter being read; the body supplies no such place/seed/record chain and admits the roll-call comparison is not done. Complete those proofs and keep SG-LAWS-state-party-loyalty-target open until the replacement is demonstrated. Correct the chamber inventory too: the body says Nebraska is absent, but the new table at :118 includes NE.lower=0.6, while :47 contains HI.lower only. The 98 values therefore do not represent the claimed set of partisan state chambers. Morning review blocks this head; no local gate pass is claimed.; finish on that branch, merge main into it first.
