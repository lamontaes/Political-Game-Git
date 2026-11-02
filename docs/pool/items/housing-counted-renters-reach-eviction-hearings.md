---
id: housing-counted-renters-reach-eviction-hearings
title: "Counted renters can reach an eviction hearing and its right-to-counsel lawyer, as full renters do (Clemmons, North Carolina: 0 hearings in 700 days)"
area: core
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: laws
---

**What.** Housing opens an eviction case only from a full household's lease: contract with arrears past the grace period. In Clemmons, North Carolina (about 22,800 people; key 3712960, world seed 24811d36fe547b3e21330b24f52ba0fb17dffce7368ad148f5ae6056676ba0d6, GOLDEN_PATH_SEED=hr-fresh-9c2) housing's cases table had 0 rows in 700 days with the right-to-counsel law in force on 23 of 24 monthly checks. If counted renters (paid by their groups as rent: contracts) can never produce a case, only full households can, which breaks one model, two tiers (AGENTS.md). PR 7136 passes such a town over in law-wiring-housing.test.ts; it does not answer this.

**Rules.** One model, two tiers: a counted group is read by every engine with the same rule as a full person times its count. No dice: a hearing comes from arrears and the place's steps. Wire to the world. Estimate, never unknown. Look first: core-counted-eviction-kin-notice and core-evicted-counted-stays-counted cover what happens after a counted household is evicted, not whether it reaches a hearing.

**Done when.** In a drawn place with counted renters, a counted household whose rent goes unpaid past the grace period reaches a housing case row by record id, and the right-to-counsel law in force pays its lawyer through the journal, or the item names the rule that keeps counted renters out of cases and the owner-decision registered. The law-wiring-housing counsel case passes at hr-fresh-9c2 without passing over the town. Place and seed named in the PR body.

**Files.** src/core2/modules/housing.ts,src/core2/law-wiring-housing.test.ts

**Notes.** lead: laws. Found by red main fixer 2 (Nov 2) and raised by the laws lead. Cause of the red, test side: PR 7136. Unverified whether counted renters can reach cases; first step is to read housing.ts around the late-lease loop (about line 1455) and the counted rent path.
