---
id: people-partnership-ends
title: "A partnership ends from strain, closeness and money, and one partner moves out"
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

**What.** A partnership ends when staying costs more than leaving: the partners' strain (arguments, money trouble, unemployment, a long absence), closeness that has faded and the law on divorce. Each partner decides through the shared chooser; when either does, one moves out through the household call, taking their share of cash and not the lease. The event `people.separated` carries the reasons so the director, the journal and the people involved can speak of it; children stay with a parent by the rule that parent's household takes (the lower-strain, higher-income partner first, a documented estimate).

**Rules.** No dice: the outcome comes from the people's ages, closeness, traits, money, housing and the law in force, never a fixed percentage; real rates check totals only. One model, two tiers. This is a game, not a spreadsheet: no new player step; the player sees it as people's lives and the director's scenes. No hand-written player text. Estimate, never UNKNOWN. Replace, never layer.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, a drawn place from all 56, seed named) a separation appears as a record by id with both partners' reasons, the new lease for the one who left and the balanced journal. A test in src/core2 names the place and seed.

**Files.** src/core2/modules/partnerships.ts, src/core2/data/partnerships/

**Notes.** Needs core-household-membership-change. Do after or with people-partnership-forms (the same module).
