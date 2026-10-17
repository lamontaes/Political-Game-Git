---
id: people-partnership-forms
title: "Two single adults who are close, fit in age and can afford it become one household, as a decision from their traits and money"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: core-household-membership-change
source: added with npm run pool -- add
---

**What.** Two single adults in the town who know each other become one household. Each weighs it through the shared chooser (`chooseAct`) from their closeness to the other, age fit, traits, income and savings against the shared home they would have, and the law (marriage law by state, data not code). When both choose it, one moves into the other's home or both into a new lease, through the household call. Read the Oct 17 findings in people-partnerships-form-and-end first, and `docs/coordination/OWNER-DECISIONS.md`: how marriage works for the player is undecided, so this item covers the town's other people only and shows partnering as a record the director can read (event kind `people.partnered`).

**Rules.** No dice: the outcome comes from the people's ages, closeness, traits, money, housing and the law in force, never a fixed percentage; real rates check totals only. One model, two tiers. This is a game, not a spreadsheet: no new player step; the player sees it as people's lives and the director's scenes. No hand-written player text. Estimate, never UNKNOWN. Replace, never layer.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, a drawn place from all 56, seed named) at least one pair of full people forms a household as a record by id, with both people's reasons and the new lease and journal records, and a named couple is traced from closeness to the lease. A test in src/core2 names the place and seed.

**Files.** src/core2/modules/partnerships.ts, src/core2/data/partnerships/, src/core2/opening-partnership.ts

**Notes.** Needs core-household-membership-change. Marriage and divorce law by state is data to read, not named in code.
