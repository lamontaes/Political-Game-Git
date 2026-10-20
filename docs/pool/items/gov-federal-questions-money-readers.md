---
id: gov-federal-questions-money-readers
title: "Federal tax, benefit and loan questions, once enacted, move federal dollars that the budget and households read"
area: gov
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
after: gov-federal-questions-answers-stances
blocked-on:
milestone:
source: split from gov-stopgap-world-legislating-missing-mechanic by pool feeder Oct 20
---

**What.** For the federal-only questions that move money (top income tax rate and the federal income, sales, excise, payroll and corporate tax terms, retirement age, student-loan forgiveness, housing vouchers, Medicare drug price negotiation, farm subsidies, consumer-loan interest cap, passenger rail, states' share of disaster costs, the debt limit), write a core2 effect reader for each: the enacted law row changes a federal rate or an outlay that the federal budget, payroll withholding or a household's check reads. Reuse the engines that exist (the macro federal dollar, payroll withholding, social-insurance ages, the loans and credit modules) and add data rows for the terms; do not port the old src/simulation/federal-*.ts files.

**Rules.** An effect is a read, not a record: each enacted answer changes a rate or payment another engine reads on the day it decides. The chain is the acceptance: one federal law is followed to a named person's check or tax and back to the director's journal line. One model, two tiers: counted groups pay or receive by the same rule times their count. One rule, all 56 places: terms are data and a person's state changes their reach only through data. No hand-written player text: the notice and journal line come from the English engine. Replace, never layer: do not copy old-core federal law code.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, an enacted federal money question changes a named person's tax or payment and the federal budget line, shown by law, journal and person record ids; src/core2/federal-money-questions.test.ts proves it for every question listed and the speed of a game year is within 20 percent of before.

**Files.** src/core2/modules/laws.ts, src/core2/modules/budgets.ts, src/core2/law-reach/group-a-money.ts, src/core2/data/laws/reach-group-a.json, src/core2/federal-money-questions.test.ts

**Notes.** Oct 20 (pool feeder): part 2 of 4 of gov-stopgap-world-legislating-missing-mechanic. Size M assumes the builder covers the questions the existing engines can carry first; any question needing a new engine becomes its own pool item.
