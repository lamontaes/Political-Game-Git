---
id: officials-from-elsewhere-open-with-no-savings
title: "A state's or territory's cabinet and the town's filing officers open with no cash, no savings and no household cost, and a territory's filing officers hold no job at all"
area: world
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: T54
pr: "#9682"
after:
blocked-on:
root: none
lead: money
model: opus
effort: medium
source: "T54's trace of opening-adults-cash by person id, Nov 16 05:40Z (Leloaloa AS seed 6682f9f6c16ebcfb, Tutu VI seed 722c036a9cce0bae)"
---

**What.** At Leloaloa AS and Tutu VI (`drawPlace(seed, "opening-adults-cash")`, seeds 6682f9f6c16ebcfb and 722c036a9cce0bae), 19 adults open with nothing: 17 cabinet members `person:cabinet:US-AS:<department>:0` (and US-VI) and two filing officers `person:filing-officer:<town>:municipalOffice` and `:countyOffice`. The cabinet hold 0 until their first monthly pay on Mar 1 ($4,471.47; one still 0 on Mar 2) and have no household cost; the filing officers hold nothing and no job all year. `opening-adults-cash.test.ts` is red at both towns, 19 of 65 and 19 of 67 against a floor of about 25%. Seen: dev mode's trace of a cabinet member (Opening savings and the ledger) and the test's message.

**Cause.** Found in code: `giveLivingCost` (src/core2/official-living.ts) gives anyone seated from elsewhere a one-person household's cost and the savings a family at their pay keeps; official pay (`seat`), staff and press staff call it. `fillInCabinetPerson` and `seatDrawnOfficer` (src/core2/modules/executive.ts) fill people in with `fillInIdentity` and never call it, and the cabinet have no officials row, so official pay never seats them. Filing officers are put on a "city" or "county" payroll, and a territory's budgets hold only federal and state governments, so `startPublicJob` is never reached.

**Fix.** (1) A cabinet member from elsewhere and an officer drawn for a counter get `giveLivingCost` at the post's yearly pay (the appointee's hourly pay times the full-time hours, as staff.ts does), from their state's government, and spend it on the 1st of each month with `spendLivingCost` (executive's `livingCosts` table, as staff spends for its rows). Official pay's path could not carry them: its rows pay their own salary on payday and spend only inside a paid month, while the cabinet are paid by the public payroll on their job, so a pay row would pay them twice. (2) No filing officer is seated for a family the place's filing record says does not apply (`filingFamilyApplies`, elections.ts, reading `applicable: false`): a territory's municipal and county families, and the county family in AK, CT, RI, DC, PR, GU and MP, and the municipal family in HI. The Account lead's rulings, Nov 16.

**Time box.** 3 hours, Opus, medium.

**Rules.** One model, two tiers; one engine: the living-cost step official-living.ts already has, never a second; estimate, never unknown: savings from the survey's row by pay.

**Done when.** opening-adults-cash.test.ts passes at Leloaloa and Tutu with no change to its bound (pinned in the PR stacked on this one), and at both the cabinet members hold the savings their pay keeps on day 0, by record id `savings:person:cabinet:US-AS:<department>:0:2025-01-20`; no filing officer is seated where the record says the family does not apply. A second session sees in dev mode, at a drawn territory town it names with its seed, a cabinet member's opening savings and living cost.

**Waits on.** Nothing.

**Files.** src/core2/modules/executive.ts, src/core2/modules/elections.ts.
