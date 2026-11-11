---
id: gov-federal-questions-money-readers
title: "Federal tax, benefit and loan questions, once enacted, move federal dollars that the budget and households read"
area: gov
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
after: gov-federal-questions-answers-stances
blocked-on: gov-federal-questions-money-readers-part-1-tax-terms, gov-federal-questions-money-readers-part-2-retirement-loans-vouchers, gov-federal-questions-money-readers-part-3-drugs-farms-rail, gov-federal-questions-money-readers-part-4-disaster-share-debt-limit
milestone:
source: split from gov-stopgap-world-legislating-missing-mechanic by pool feeder Oct 20
lead: governing
standard: 2
model: sonnet
effort: low
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** Federal tax, benefit and loan questions, once enacted, do not yet move federal dollars that the budget and households read. For the federal-only questions that move money (top income tax rate and the federal income, sales, excise, payroll and corporate tax terms, retirement age, student-loan forgiveness, housing vouchers, Medicare drug price negotiation, farm subsidies, the consumer-loan interest cap, passenger rail, states' share of disaster costs, the debt limit), write an effect reader for each: the enacted law row changes a federal rate or an outlay that the federal budget, payroll withholding or a household's check reads. Reuse the engines that exist (the macro federal dollar, payroll withholding, social-insurance ages, the loans and credit modules) and add data rows for the terms. The consumer-loan cap is already read (`householdApplications` in `src/core2/modules/credit.ts`, proved by `src/core2/law-wiring-small-dollar-lenders.test.ts`); its federal budget line and journal line are still open. The work is four parts. Seen: a federal tax or benefit law, once passed, changing the federal budget line and a household's paycheck he can open.

**Cause.** Found in code: `src/core2/law-reach/group-a-money.ts` and `src/core2/data/laws/reach-group-a.json` hold the reach rows (`budgetToday` in the money reach file reads the budget); the federal-only money questions (tax terms, ages, loans, vouchers) have no readers except the consumer-loan cap.

**Fix.** Do the four parts, each adding the reader at the engine that pays or taxes (macro federal dollar, payroll withholding, social-insurance ages, the loans module) and the data rows for its terms, so an enacted law changes a named person's payment and the federal budget line.

**Time box.** 2 hours for one Sonnet session, the closing check after the parts. When it runs out, write what was seen in the item and stop.

**Rules.** An effect is a read, not a record: each enacted answer changes a rate or payment another engine reads on the day it decides. The chain is the acceptance: one federal law is followed to a named person's check or tax and back to the director's journal line. One model, two tiers: counted groups pay or receive by the same rule times their count. One rule, all 56 places: terms are data. No hand-written player text. Replace, never layer. Speed: a game year stays within 20 percent of before.

**Done when.** A second session plays a one-year world (`buildBenchWorld`, every module) in a place drawn from all 56 with a seed the builder did not choose, and sees an enacted federal money question change a named person's tax or payment and the federal budget line, shown by law, journal and person record ids, for every question listed; all four parts are merged and seen.

**Waits on.** gov-congress-passes-policy-laws (a federal law must be enactable), and the four parts: gov-federal-questions-money-readers-part-1-tax-terms, gov-federal-questions-money-readers-part-2-retirement-loans-vouchers, gov-federal-questions-money-readers-part-3-drugs-farms-rail, gov-federal-questions-money-readers-part-4-disaster-share-debt-limit.

**Files.** src/core2/modules/laws.ts, src/core2/modules/budgets.ts, src/core2/law-reach/group-a-money.ts, src/core2/data/laws/reach-group-a.json

**Notes.** Oct 20 (pool feeder): part 2 of 4 of gov-stopgap-world-legislating-missing-mechanic. Size M assumes the builder covers the questions the existing engines can carry first; any question needing a new engine becomes its own pool item.
Nov 1 (claude/laws-small-dollar-lenders): the consumer-loan interest cap's rate is read: the credit engine quotes the bank's and the small-dollar lender's loans at the catalog ceiling (consumerLoanRateCap) under the federal law where it is in force (householdApplications in src/core2/modules/credit.ts) and credits the interest it held back to that law's applied rows; src/core2/law-wiring-small-dollar-lenders.test.ts proves it in a played federal world. Its federal budget line and the director's line are still this item's.
