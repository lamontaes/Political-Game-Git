---
id: credit-0-a-a-shortfall-reads-the-months-income
title: "A household asks for a loan only when its cash and the month's income cannot cover the month, and lenders read the same income"
area: core
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: T54
pr:
after:
blocked-on:
root: none
lead: jobs
model: opus
effort: medium
source: "Account lead, Nov 15 22:16Z (promises thread's Cherry Hill trace of #9117); T54's trace 22:20Z; lead's ruling 22:21Z (one reader for a household's monthly income, the wages-only read deleted)"
---

**What.** At Cherry Hill VA (5115176, seed promises-real-loan-1) the first 30 days held 2,550 loan applications (2,496 from counted households), the storefront lender's cash read $0 from March on, and 371 bank personal loans were open by June in a town of about 10,000 households, so a player who would borrow is refused. Households asked whatever came in that month. Seen: the bank's and the storefront's loans over the first months, and dev mode's Trace of an application with its income.

**Cause.** Found in code: `householdApplications` (src/core2/modules/credit.ts) asked for every household whose cash was below a month of costs, whatever came in; with the survey's opening balances (#9117) 85% of Cherry Hill's counted households are below. `borrowingHouseholds` read a counted household's income as its wages alone, so the 53% with no wage (retirees on awards) read as having no income, the bank refused them, and the storefront lent to them.

**Fix.** One reader, `monthlyIncome` (credit.ts), for full and counted households: pay that arrives, Social Security and pension awards, and open unemployment claims. The asking side and the bank both read it; the wages-only counted read is deleted. A household asks only when its cash and the month's income fall short of the month's costs.

**Time box.** 3 hours, Opus, medium.

**Rules.** One model, two tiers: one income reader for both. No dice. No new weight.

**Done when.** A pinned test at Cherry Hill VA (5115176, seed promises-real-loan-1) shows a counted retiree household's income equal to its awards, no application in the first 30 days from a household whose month's income covers its costs, and the storefront lender with cash at the month's end, red on the base. Year 1 and records at three places, twice a side, alternated, with loans made in the year. A second session sees at a drawn place it names with its seed that the storefront lender still has cash after the first months.

**Waits on.** Nothing.

**Files.** src/core2/modules/credit.ts, src/core2/credit-shortfall-income.test.ts (new).
