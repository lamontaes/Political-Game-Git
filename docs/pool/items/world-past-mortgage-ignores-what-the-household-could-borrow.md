---
id: world-past-mortgage-ignores-what-the-household-could-borrow
title: "The housing past hands a household a restated mortgage without checking it could have borrowed that much"
area: world
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "asked for by the Account lead on the resident spending build, Nov 15"
claimed-at:
after:
lead: account-lead
model: opus
effort: medium
root: rc9-place-facts-one-default
checked: sonnet 2026-11-15
---

**What.** `restateMortgage` re-derives a full owner's loan from the year the move record says they bought, with no check of the income the household had then. Seen: at Henlopen Acres, Delaware, seed pt6:0, 14 of the 34 full owners with a mortgage pay more than 28 percent of their pay from jobs in monthly mortgage payments and 4 more than 43 percent, the highest 4.95 times that pay (pay here counts jobs only, so households living on pensions overstate it). At Matagorda, Texas, seed pt1:0, and Gibraltar, Michigan, seed pt8:0, none exceed 28 percent. The five households printed at Matagorda (restated payments 286, 437, 1,224, 1,258 and 1,838 dollars a month) all stay under 25 percent. Feeds: world-resident-spending-follows-income.

**Cause.** Found in code: `mortgageFrom` in `src/core2/housing-mortgages.ts` takes only the owner's age, the home's value, the year and the place; nothing in it or in `restateMortgage` (`src/core2/housing-past.ts`) reads the household's income then, so no lender's debt-to-income test applies.

**Fix.** Design: let the loan depend on what the household could borrow when it bought: the same smooth debt-to-income decline the credit engine uses (`src/core2/modules/credit.ts`), read against the household's pay at the purchase year from the pay series the past already keeps (`paySeries` in housing-past.ts), so a purchase beyond it takes a smaller loan and a larger down payment instead.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, write what was seen in the item and stop.

**Rules.** No dice; sliding scales, no threshold; one engine reads the debt-to-income rule.

**Done when.** A second session, not the builder, builds the world at a drawn place and seed it names (Henlopen Acres, seed pt6:0, is one that shows it) and sees no full owner whose restated payment is over 43 percent of the pay the household had in the year it bought, naming households and both figures.

**Waits on.** None.

**Files.** src/core2/housing-mortgages.ts; src/core2/housing-past.ts

**Notes.** Found while tracing why the opening's mortgages double in world-resident-spending-follows-income.
