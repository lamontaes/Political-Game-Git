---
id: counted-fill-in-share-bound-by-savings-claim
title: "The fill-in share test bounds a record by its people's average share, but a group's money is shared by savings claim"
area: world
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: T54
pr:
after:
blocked-on:
root: none
lead: money
model: sonnet
effort: medium
source: "T54's trace for #9597, Nov 16 00:50Z (the Account lead's order of 00:30Z: every related red explained, and an item for each that stays red); the lead's yes, Nov 16 (bound by savings claim, worked out in the test from the records, never the engine's share function, seen red against a broken share first)"
---

**What.** `src/core2/counted-fill-in-share.test.ts` is red at all three of its pinned places on the Train (ef708196): Central Falls RI (4414140, seed 214f3cabe3d2caa9), Larned KS (2038700) and Merizo GU, each at "asks more than its people hold". It passed at 058294ec and turned red with the #9117 fold (4fcbe42e), measured at Larned and Merizo. #9597 and the opening-savings fix on top of it leave it red (Merizo 219,523 against a bound of 142,953). Seen: the test's own message.

**Cause.** Found in code: the test bounds each record's share by `fund × weightedCount / people`, the group's money per person, but since #9117 `householdCash` (src/core2/modules/residents.ts) shares a group's account by savings claim (its people at its savings weight over the group's claims). A record with a savings weight above one rightly holds more than the per-person average, so the bound reads the old sharing rule. The test's real premise (a record that stands for less than one household never asks more than the fund, the Central Falls fault of Nov 14) still holds: its second assertion, the records' total against the fund, passes.

**Fix.** Bound each record by its own claim, worked out in the test from the records and never from the engine's share function: `fund × weightedCount × saving / Σ (weightedCount × saving)` over every record of the group, where `saving` is the record's kept savings draw. Every record in the test stands for 0.3 of a household, so `weightedCount` is below `countedCount` and this is the share the reader pays. The total-against-fund assertion stays. The old premise is stated in the test's header. The Account lead's yes, Nov 16.

**Time box.** 1 hour, Sonnet, medium.

**Rules.** One model, two tiers: the test reads the same share the game pays a filled-in household, never a second rule. Pinned tests: the three named places stay, and the old premise is stated in the change.

**Done when.** The test passes at its three pinned places on #9657's code with the bound by claim, and fails at all three with the reader's cap on the record's own people removed (a deliberately broken share). A second session sees in dev mode, at a drawn place it names with its seed, a household filled in from a counted record take no more than its share of its group's money.

**Waits on.** Nothing.

**Files.** src/core2/counted-fill-in-share.test.ts.
