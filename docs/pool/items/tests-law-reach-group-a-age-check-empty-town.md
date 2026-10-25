---
id: tests-law-reach-group-a-age-check-empty-town
title: "The group A law reach test expects the social media age check to reach someone in a town with no teenager and no online business"
area: laws
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `src/core2/law-reach-group-a.test.ts` runs every record-only law through `recordRoundTrip` and requires each to reach someone. On CI's random seed 4fbd5b9fb2634ed13ab0c0251ffacef17651e45390b4c2b358c7d86e96055bc3 it draws Monowi, Nebraska (3132550), and the social media age check reaches no one: "us-policy-positions:technology-privacy.age-verification-for-social-media reached no one: expected 0 to be greater than 0" (CI unit job on #6012, Oct 25). Main at 71454fc4f0 fails the same way on that seed (measured by the laws lead). The law reaches residents aged 13 to 17 and organizations in the `online` group (`src/core2/data/laws/reach-group-a.json`), and that town's world holds neither, so reaching no one is the engine's right answer. The test is wrong, not the engine, and it turns any PR's unit job red when CI draws such a town.

**Rules.** One rule, all 56 places: the test judges a law where the drawn town has its subject, read from the town's own records, and names the place when it has none. No dice: nothing about the law's reach changes; the test only reads the town.

**Done when.** `recordRoundTrip` checks the law's mechanic instead of its reach (the existing `mayBeEmpty` path) when the drawn town has no resident or counted group in any of the law's selected ages and no organization in its selected groups, logging the place and which selectors found nobody; the test passes on seed 4fbd5b9fb2634ed13ab0c0251ffacef17651e45390b4c2b358c7d86e96055bc3 (Monowi, Nebraska) and on a fresh seed named in the PR, and still fails if the age check's handler is switched off in a town that has teenagers.

**Files.** src/core2/law-reach-group-a.test.ts

**Notes.** From the laws lead, Oct 25, reading #6012's red unit job. The rights family (#5669) moves the age check's reach to its own engine, so whoever takes this checks the test against that branch too.
