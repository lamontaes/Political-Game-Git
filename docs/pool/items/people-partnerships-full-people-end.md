---
id: people-partnerships-full-people-end
title: "Full people separate and divorce from closeness, strain, money and the law in force"
area: people
kind: feature
priority: 2
size: M
status: blocked
claimed-by:
pr:
blocked-on: spec: the item text is an empty TODO shell; the done-when must be written before it can be built (pool-todo-shells-need-spec)
after: core-family-link-change,core-household-membership-change
source: added with npm run pool -- add
---

**What.** A partnered pair of full people separates when strain, money trouble and the closeness between them make staying worse for one of them, and divorce follows only as the divorce law in force where they live allows it. The core's end-link call closes the partner link, one of them leaves the household with a lease and cash share by journal record, and the births engine stops reading them as a couple. The director plays the breakup as a scene for the player's circle.

**Rules.** No dice: the outcome comes from ages, closeness, traits, money, housing and the law in force; real rates check totals and never pick one couple. One model, two tiers: counted people follow the same rule times their count. Wire to the world: a new household moves a dwelling, lease and cash by journal record.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) a named couple is traced from the strain and closeness records to the ended partner link id, the new lease id and the journal record that split their cash. A test in src/core2/people-partnerships.test.ts names the place and seed.

**Files.** src/core2/modules/people.ts, src/core2/modules/housing.ts, src/core2/data/people/, src/core2/people-partnerships.test.ts

**Notes.** Split from people-partnerships-form-and-end (L) on Oct 19. Read docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md first for any ruling on how partnerships are shown.
