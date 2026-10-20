---
id: people-partnerships-full-people-form
title: "Full people form partnerships from age, closeness, traits, money and housing, and the law in force"
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

**What.** Two full people who are single adults form a partnership when their closeness, ages, traits, money and housing make it the better choice for both, and the marriage law in force where they live allows it. The partnership is recorded through the core's partner link call, and the two people become one household with a lease or home, their cash and accounts following by journal record. The director reads the record and plays it as a scene when the person is the player or in the player's circle.

**Rules.** No dice: the outcome comes from ages, closeness, traits, money, housing and the law in force; real rates check totals and never pick one couple. One model, two tiers: counted people follow the same rule times their count. Wire to the world: a new household moves a dwelling, lease and cash by journal record.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) a named couple is traced from the closeness record to the partner link id, the new household's lease id and the journal record that moved their cash. A test in src/core2/people-partnerships.test.ts names the place and seed.

**Files.** src/core2/modules/people.ts, src/core2/opening-partnership.ts, src/core2/data/people/, src/core2/people-partnerships.test.ts

**Notes.** Split from people-partnerships-form-and-end (L) on Oct 19. Read docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md first for any ruling on how partnerships are shown.
