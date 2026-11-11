---
id: laws-party-loyalty-roll-calls
title: "Party loyalty calibrated from each legislature's public roll calls"
area: laws
kind: research
priority: 3
status: open
standard: 2
claimed-by:
pr: #5521
blocked-on:
milestone:
source: "owner rulings, Oct 15 afternoon (docs/coordination/OWNER-DECISIONS.md)"
claimed-at:
after:
lead: laws-effects
model: sonnet
effort: medium
root: rc9-place-facts-one-default
size: M
checked: fable 2026-11-10
branch: claude/pool-laws-party-loyalty-roll-calls
---

**What.** State legislators' party loyalty runs on one shared weight, `weights.statePartyLoyalty` (value 1, in src/core2/data/officials/officials.json, read in src/core2/modules/officials.ts where a member's party term is scaled). It is checked against the federal party-unity figure (about 0.90) because the state roll-call input is not in the repository (stopgap SG-LAWS-state-party-loyalty-target). The owner's Oct 15 ruling lets the Shor-McCarty dataset calibrate this one parameter with nothing shipped; the replacement calibrates each chamber from its own public roll-call records. A player would see members of each chamber vote with or against their party the way that chamber really does. The sibling laws-party-loyalty-roll-call-weighing is proposed to merge here.

**Cause.** Found in code: `weights.statePartyLoyalty` (one shared value) in src/core2/data/officials/officials.json, read in src/core2/modules/officials.ts (line 1440) and scaled with `partyLoyaltyWeight` in src/core2/modules/voting.ts; the test src/core2/party-loyalty.test.ts; and stopgap SG-LAWS-state-party-loyalty-target in src/core2/data/stopgaps/laws.json.

**Fix.** Tabulate each chamber's public roll-call party-unity rate with source and years, store a per-chamber multiple in a data table (ESTIMATED with spread where none is published), read it where the member's party term is scaled, and delete the shared weight. The test reports the simulated unity rate and does not fail the run on a band.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: real roll calls calibrate the parameter and never decide one member's vote. No dice: a vote comes from the member's traits, principles, relationships and the bill, with loyalty one input. One rule, all 56 places: each chamber's value comes from data, tagged SOURCED with citation. Wire to the world: the legislature engine reads the parameter at the vote. Ranges are not targets (owner, Nov 8): the roll-call rate calibrates the parameter inside the cause formula, and no check fails a run for leaving a band.

**Done when.** A second session, not the builder, replays this on main: in a one-year played world (buildBenchWorld, a drawn state from all 56, place and seed named) a state chamber vote record id shows the member's party term scaled by that chamber's own multiple, every chamber row in the table is tagged SOURCED with its source and years or ESTIMATED with a spread, and the shared weight is gone. src/core2/party-loyalty.test.ts reports the simulated unity rate (no pass or fail on a band), src/core2/voting.test.ts covers the read, and SG-LAWS-state-party-loyalty-target is resolved, never deleted, in src/core2/data/stopgaps/laws.json. The owner plays it: watch a party-line vote in a state that really splits that way.

**Waits on.** Nothing.

**Files.** src/core2/modules/officials.ts, src/core2/modules/voting.ts, src/core2/data/officials/officials.json, src/core2/data/officials/state-chamber-loyalty.json (new), src/core2/data/stopgaps/laws.json, src/core2/party-loyalty.test.ts, src/core2/voting.test.ts

**Notes.** Owner ruling (Oct 15): Shor-McCarty may calibrate the state-chamber party-loyalty parameter; nothing ships, no citation; one calibration input weighted against roll calls.
Sent back 2026-10-20 from PR #5159 (branch claude/political-game-pool-l9cym2): Morning check failed because stopgap row SG-LAWS-state-party-loyalty-target was deleted from stopgaps.json instead of resolved; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5521 (branch claude/political-game-pool-yucp92-rr): `src/core2/data/officials/state-chamber-loyalty.json:4` explicitly leaves each legislature’s own roll calls to be collected later. The existing ruling at `docs/coordination/OWNER-DECISIONS.md:245` permits the calibration input but requires it to be weighted against those roll calls; it does not waive that work. `docs/pool/items/laws-party-loyalty-roll-calls.md:20` also requires a named one-year drawn-world chamber-vote record showing the calibrated value being read, which the body does not provide. Complete the roll-call calibration and that trace, keeping SG-LAWS-state-party-loyalty-target open until its replacement is demonstrated. No further owner permission is needed for the already-ruled calibration route. Morning check blocks this head; no local gate pass is claimed.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5159 (branch claude/political-game-pool-l9cym2): The restored stopgap row and removal of owner/date notes answer the prior send-back. The remaining calibration acceptance is unmet: state-chamber-loyalty.json:4 still says each legislature's own roll calls will be collected later, while docs/coordination/OWNER-DECISIONS.md:245 requires this input to be weighted against those roll calls. No new owner permission is needed for the already-ruled route. docs/pool/items/laws-party-loyalty-roll-calls.md:20 also requires a one-year drawn-world chamber-vote record ID showing the calibrated parameter being read; the body supplies no such place/seed/record chain and admits the roll-call comparison is not done. Complete those proofs and keep SG-LAWS-state-party-loyalty-target open until the replacement is demonstrated. Correct the chamber inventory too: the body says Nebraska is absent, but the new table at :118 includes NE.lower=0.6, while :47 contains HI.lower only. The 98 values therefore do not represent the claimed set of partisan state chambers. Morning review blocks this head; no local gate pass is claimed.; finish on that branch, merge main into it first.

Deferred Oct 25: nothing on screen reads it yet.

Released (2026-11-11): Needs sourced per-chamber roll-call unity rates for about 99 state chambers fetched from public records; prior attempts were sent back for unsourced values, and a one-session fetch of that dataset is not attainable here. Continue on branch claude/pool-laws-party-loyalty-roll-calls and pull request #5521.
