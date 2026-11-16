---
id: counted-fill-in-share-bound-by-savings-claim
title: "The fill-in share test bounds a record by its people's average share, but a group's money is shared by savings claim"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: money
model: sonnet
effort: medium
source: "T54's trace for #9597, Nov 16 00:50Z (the Account lead's order of 00:30Z: every related red explained, and an item for each that stays red)"
---

**What.** `src/core2/counted-fill-in-share.test.ts` is red at all three of its pinned places on the Train (ef708196): Central Falls RI (4414140, seed 214f3cabe3d2caa9), Larned KS (2038700) and Merizo GU, each at "asks more than its people hold". It passed at 058294ec and turned red with the #9117 fold (4fcbe42e), measured at Larned and Merizo. #9597 and the opening-savings fix on top of it leave it red (Merizo 219,523 against a bound of 142,953). Seen: the test's own message.

**Cause.** Found in code: the test bounds each record's share by `fund × weightedCount / people`, the group's money per person, but since #9117 `householdCash` (src/core2/modules/residents.ts) shares a group's account by savings claim (its people at its savings weight over the group's claims). A record with a savings weight above one rightly holds more than the per-person average, so the bound reads the old sharing rule. The test's real premise (a record that stands for less than one household never asks more than the fund, the Central Falls fault of Nov 14) still holds: its second assertion, the records' total against the fund, passes.

**Fix.** Bound each record by its claim: `fund × min(countedCount, weightedCount) × savingWeight / claimsInGroup`, the share `householdCash` reads, keeping the total-against-fund assertion. This restates the old premise under the new sharing rule, so it needs the Account lead's yes before it is built.

**Time box.** 1 hour, Sonnet, medium.

**Rules.** One model, two tiers: the test reads the same share the game pays a filled-in household, never a second rule. Pinned tests: the three named places stay, and the old premise is stated in the change.

**Done when.** The test passes at its three pinned places on the Train with the bound by claim, and with the claim bound taken back to the per-person one it fails at Merizo, as now. A second session sees in dev mode, at a drawn place it names with its seed, a household filled in from a counted record take no more than its share of its group's money.

**Waits on.** The Account lead's yes on the restated bound.

**Files.** src/core2/counted-fill-in-share.test.ts.
