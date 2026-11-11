---
id: elections-campaign-turn-raise-money-by-seed
title: "campaign-turn's raise-money case fails by seed in Whiteville, North Carolina"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: low
root: none
source: governing lead, Nov 2 (found by the platform workflow on Nov 1, red on main too)
lead: governing
checked: fable 2026-11-10
---

**What.** `src/core2/campaign-turn.test.ts` is red on main by seed. On the seed this item was filed for (GOLDEN_PATH_SEED=53cc0ecaeb4fa8faa359aa4d217f1bef751915df839c9f9e668e38aba1d6ac6c) the raise-and-spend case now passes. The case "a rich rival holds an event on a day it is offered and a poor one does not" fails instead, at its last line: `campaignTurn(...).dayAct` is null where `rivalDay` chose an event. The test draws its place from the seed, so the place is Virgie, Kentucky (2179860), not Whiteville. Fix the test's draw so the case runs on a race whose events are held in the town. Guards: the campaign turn a rival takes in the player's race, an event the player can see in town.

**Cause.** Found in code: the test pairs two candidates for the first contest they both qualify for (`twoCandidates`, `src/core2/campaign-turn.test.ts` line 100). In Virgie that contest is `contest:seat:US-KY:us-senate:0:2026-11-03`, a statewide race. `campaignTurn` (`src/core2/modules/campaigns.ts` line 6343) holds the event only when `heldInTown` (line 2595) says so. For a race the town is only part of, `heldInTown` adds the town's share of the race's voters (`townShareOfRace`, line 2570) to `townEventCredit` and holds the event in town only when the credit reaches 1. A probe on main 6e88a3f4f9 printed a credit of 0.0000587 after the turn: Virgie's adults over Kentucky's voters. So the rival's event is held elsewhere in the state and `dayAct` stays null. The engine is right (the Nov 8 speed ruling on House candidates' town halls). The test's `suits` check for this case (line 354) asks only whether an event can be offered, not whether the race is the town's own.

**Fix.** Test only. Export `townShareOfRace` from `src/core2/modules/campaigns.ts` (no change to its body). In the `suits` callback of the "rich rival holds an event" case, return a reason such as `the first contest is a wider race the town holds only a share of (<share>)` when `townShareOfRace(w.api, w.pair.rival.contestId) < 1`, so `worldWithPair` draws on and the case names what it passed over, as `drawn-place-tests` says. Do not loosen the `dayAct` assertion.

**Time box.** 1 hour for one Sonnet session.

**Rules.** Never loosen the assertion: fix the generated inputs, as the skill drawn-place-tests says, and keep the engine's town-share rule as it is. One rule, all 56 places: the test names the place and seed it drew and the places it passed over. No dice: nothing in the fix adds a roll; the draw goes on by the world's own records.

**Done when.** A second session runs `src/core2/campaign-turn.test.ts` with GOLDEN_PATH_SEED=53cc0ecaeb4fa8faa359aa4d217f1bef751915df839c9f9e668e38aba1d6ac6c and on two fresh seeds (written down), and sees the rich-rival case pass on a race whose `townShareOfRace` is 1, its message naming the place drawn and any statewide or district race passed over.

**Waits on.** Nothing.

**Files.** src/core2/campaign-turn.test.ts, src/core2/modules/campaigns.ts

**Notes.** Filed by the governing lead, Nov 2; the Done when was lengthened by the CTO to pass the pool check (Nov 2, 00:30). The donor call list ruled at 00:25 (OWNER-DECISIONS) may change who is reached; rerun on it before tracing.

**Notes (re-run, 2026-11-11, main 79d23fa596).** `GOLDEN_PATH_PLACE_KEY=3773660 GOLDEN_PATH_SEED=53cc0eca...6c npx vitest run src/core2/campaign-turn.test.ts`: the test draws its place from the seed, not the key, so it ran in Virgie, Kentucky (2179860) and not Whiteville. The raise-and-spend case named here passed; a different test failed: "a rich rival holds an event on a day it is offered and a poor one does not": "expected null to be 'event'". Fresh draw `GOLDEN_PATH_SEED=e1e888d61a8c2875` (Cascade, Montana, 3012775): the same test fails with the same message. Still red, on a different assertion.

Nov 11 (cause finder for Fable B): reproduced on main 6e88a3f4f9 with the filed seed; it ran in Virgie, Kentucky, and the rich-rival case failed at `turn.dayAct`. A probe showed the pair's race is Kentucky's Senate race and the town's event credit after the turn is 0.0000587, so `heldInTown` rightly keeps the event out of town. The fix is the test's draw. A fresh seed (71240ecfc7c282fd, Oak Grove, Kentucky) failed two other cases of the same file: "reporters ask from the race's record" found no two candidates in 8 draws, and "two nominees of different parties never answer alike" gave the same 55 positions for both nominees in Yardville, New Jersey. Those are not this cause. The done items tests-campaign-turn-cases-fail-on-drawn-places and elections-campaign-turn-test-draws-outsiders covered earlier forms of them.
