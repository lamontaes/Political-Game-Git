---
id: tests-press-town-stand-filled-lean-rounding-sinajana
title: "The town-stand test is red at Sinajana, Guam: a filled-in resident's lean differs from their counted lean in the twelfth digit"
area: people
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: design-one-model-two-tiers
lead: views
model: sonnet
effort: medium
source: views thread, Nov 14 (seen while gating #9224)
---

**What.** `src/core2/press-town-stand.test.ts` is red at Sinajana, Guam, with the seed below. It expects a counted adult filled in to keep exactly the lean they were counted with, and their lean comes out a few trillionths different. The player would not see a difference that small; it means the two tiers compute the same lean by two routes, where the one-model rule says one. Guards: the town-stand read the paper prints.

**Cause.** Measured: `PRESS_STAND_SEED=115fffe5d3098cb5 npx vitest run src/core2/press-town-stand.test.ts` fails with "Sinajana, Guam (territory:GU:sinajana), seed 115fffe5d3098cb5:0: expected -1.30765206104056 to be -1.3076520610448898". It fails on the train at 628ff74d and before views-from-life cut 1 at 3076c608, so it is older than that work. The two values differ by about 4e-12. That points to the counted lean (`countedLean` in `src/core2/modules/views.ts`) and the filled-in view's lean (`viewOf(...).lean`, set in `fillInPerson`) adding the same terms in a different order, not to a different rule; not yet traced to the line.

**Fix.** Find where `fillInPerson` sets the new person's view lean and have it take the counted record's lean value as computed (`countedLean`), not recompute it, so both tiers hold one number. Do not loosen the test's exact check.

**Time box.** 2 hours, Sonnet at medium effort.

**Rules.** One model, two tiers: a filled-in person keeps the record's values exactly. Never loosen a test to get green.

**Done when.** The test passes at Sinajana with seed 115fffe5d3098cb5 and at two other drawn seeds, named in the PR. A second session, on the train or main, runs it at that seed and sees it pass.

**Waits on.** Nothing.

**Files.** src/core2/state.ts (fillInPerson), src/core2/modules/views.ts (countedLean), src/core2/press-town-stand.test.ts

**Notes.** Nov 14 (claude, views thread): found while gating #9224; red on the clean train at the same seed.
