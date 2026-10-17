---
id: people-leave-parents-home
title: "A young adult leaves their parents' home when work, money and housing allow"
area: people
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/leave-parents-home
pr: #4959
blocked-on:
after: core-household-membership-change
source: added with npm run pool -- add
claimed-at: 2026-10-17T17:01:22.199Z
---

**What.** An adult child still in a parent's household leaves when work and money allow and the household's space presses: ACS B09021 (young adults living with parents) is the check. The person weighs staying (rent saved, family closeness) against leaving (their income against the local rent, a job, a friend to share with) through the shared chooser; if they leave, they take a lease through the household call. Event `people.left-home`.

**Rules.** No dice: the outcome comes from the people's ages, closeness, traits, money, housing and the law in force, never a fixed percentage; real rates check totals only. One model, two tiers. This is a game, not a spreadsheet: no new player step; the player sees it as people's lives and the director's scenes. No hand-written player text. Estimate, never UNKNOWN. Replace, never layer.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, a drawn place from all 56, seed named) a young adult leaves a parent's household as a record by id with their reasons and a new lease, and the share of 18 to 29 year olds living with a parent stays within the spread of ACS B09021 for the place's state. A test in src/core2 names the place and seed.

**Files.** src/core2/modules/partnerships.ts, src/core2/modules/housing.ts, src/core2/data/partnerships/

**Notes.** Needs core-household-membership-change.
