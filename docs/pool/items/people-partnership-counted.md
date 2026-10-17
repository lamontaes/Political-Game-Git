---
id: people-partnership-counted
title: "Counted adults partner, separate and leave home by the same rules as full people, times their count"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: people-partnership-forms,people-partnership-ends,people-leave-parents-home
source: added with npm run pool -- add
---

**What.** Counted adults partner, separate and leave home by the same rules as full people, times their count: a counted group's expected events accrue month by month from the same reasons read from its columns (age, income, tenure, who lives together), and a whole household changes when one is due, as the counted-moves engine does. A person filled in later is the same household member the group record says.

**Rules.** No dice: the outcome comes from the people's ages, closeness, traits, money, housing and the law in force, never a fixed percentage; real rates check totals only. One model, two tiers. This is a game, not a spreadsheet: no new player step; the player sees it as people's lives and the director's scenes. No hand-written player text. Estimate, never UNKNOWN. Replace, never layer.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, a drawn place from all 56, seed named) counted households form, split and shed a young adult as records by group and household id, and a filled-in member matches the record. A test in src/core2 names the place and seed.

**Files.** src/core2/modules/partnerships.ts, src/core2/counted-groups.ts

**Notes.** Needs the three full-person items. One model, two tiers: the rule is the same, the count differs.
