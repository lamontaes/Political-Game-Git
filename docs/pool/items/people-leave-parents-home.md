---
id: people-leave-parents-home
title: "A young adult leaves their parents' home when work, money and housing allow"
area: people
kind: feature
priority: 2
size: M
status: blocked
claimed-by: claude/pool-people-leave-parents-home
pr: #4959
blocked-on: PR 5017 (World housing helpers) and PR 4948 landing; then merge main into claude/leave-parents-home
after: core-household-membership-change
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:35:01.028Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

**Built Oct 17 (claude/leave-parents-home, stacked on claude/household-membership).** `src/core2/modules/partnerships.ts` (installed with the people engines in src/director/play-modules.ts) reviews every adult living with a parent on the first of each month. Leaving needs a home their own pay and cash reach: a real vacant unit if the town has one (`completedRentalOffer`), else a lease at the town's typical rent, as a household without a home is rehoused (`leaseHousehold`, extracted from `rehouse` in housing.ts). The chooser then weighs going (a baseline, age past eighteen, how many times the rent their pay covers, a crowded home) against staying (closeness to the parent, the rent's share of pay). A leaver starts a household of their own through `changeHouseholdV1`, signs the lease, and the event `people.left-home` and a row in the module's `left` table carry the reasons by name. The weights are TUNABLE (data/partnerships/parameters.json, stopgap SG-PEOPLE-home-leaving-weights) and are checked against ACS B09021 by people-partnership-rates-check. First measurements: in Pinckneyville, Illinois (seed lh1) 23 of 164 adults aged 18 to 34 lived with a parent at the start and two left in the year. Only 14 percent of the sample's young adults live with a parent, against about a third in the ACS, which is the opening's kin links, not this item. The test is src/core2/home-leaving.test.ts.

Sent back 2026-10-17 from PR #4959 (branch claude/leave-parents-home): Morning check: this People/home-leaving stack edits Words-protected src/director/play-modules.ts to install partnerships. Have that installation land through a Words-owned PR, then merge main here. Merge the Core household-call prerequisite (#4948) first as well, so this People PR can be checked on its remaining diff; record World-area agreement for its housing-engine helper changes or split those helpers to World.; finish on that branch, merge main into it first.

Sent back 2026-10-19 from PR #4959 (branch claude/leave-parents-home): Morning check: edits to World-area src/core2/modules/housing.ts remain on this branch until World PR #5017 lands; finish on that branch, merge main into it first.
