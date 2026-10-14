# Treasuries now spend their budgets, and a federal cut lowers a retiree's check

OPUS-CORE needs to make two changes before a federal cut reaches most retirees: let the finance engine change an existing Social Security award, and let the pooled payments of townspeople tracked as counts change too. Until then, a cut reaches only people the game tracks one by one who start Social Security during play. In Lydia, South Carolina, that was 2 people in town, while 837 kept their old amount (measured).

The rest works. Every government treasury now pays its adopted budget each month instead of only collecting. Over 400 days in Lydia, the county treasury paid out $154.4 million of the $176.0 million it took in. Before this change it paid out $395,000.

## Before and after

Before: each month every state, county and town treasury received a twelfth of its yearly revenue from outside the town and paid almost nothing out. The U.S. treasury collected withholding and paid nothing. A federal budget cut changed no one's payment.

After: each treasury pays every line of its budget each month, to people and businesses in town first and the rest outside the town, line by line. A federal cut to Social Security lowers the next check of a retiree the game tracks one by one who claimed during play.

## What a treasury does each month

On the first of each month, every treasury (federal, state, county and town) does three things in order (read in code, `src/core2/budgets-treasury.ts:253`):

1. **Money in.** It receives a twelfth of the yearly revenue that nobody in the game pays it: fees, the taxes of people outside the town, and so on. Federal aid now comes from the U.S. treasury, and state aid to the county and town from the state treasury.
2. **Money out, line by line.** Each budget line pays a twelfth of its year. What the treasury already paid in town on that line counts first: its staff's paychecks and benefits a law pays. Next comes aid to the treasuries below it. Then the town's share of roads, housing, parks and similar work goes to the town's own businesses of that kind. The rest goes to the world outside the town, recorded by line.
3. **When money runs short.** The U.S. treasury borrows the month's gap from outside. A state, county or town treasury pays what it holds and owes the rest at the next close.

## One year in Norway, Michigan

Measured, January 20, 2025 to January 20, 2026. All four treasuries opened at $0.

| Treasury         | Took in          | Paid out         | Closing balance |
| ---------------- | ---------------- | ---------------- | --------------- |
| United States    | $6,861.8 billion | $6,861.8 billion | $34,063.92      |
| Michigan         | $100.26 billion  | $96.79 billion   | $3.46 billion   |
| Dickinson County | $37.12 million   | $36.10 million   | $1,018,208.60   |
| City of Norway   | $13.32 million   | $13.32 million   | $0.00           |

- The U.S. treasury took in $5,234.6 billion of revenue and borrowed $1,627.2 billion to cover the rest of its spending. It paid $1,542.0 billion of Social Security and $970.4 billion of interest outside the town, among other lines. It paid $39.4 billion of aid to Michigan, the county and the town.
- Michigan's largest lines were aid to local governments, $33.5 billion, and welfare and Medicaid, $24.6 billion. It paid $22.4 million of aid to Dickinson County and Norway, and $748,105 to Norway's businesses.
- The world outside the town paid the treasuries $3.50 billion more than it got back from them; that is what the treasuries kept. Before, the outside world paid in the whole year's revenue and got nothing back.
- Norway's treasury started $281,114 behind on February 1 and ran short each month to September. It caught up by October, owed nothing at year end and spent everything it took in.
- Michigan keeps $3.46 billion because its budget, built from Census per-resident figures, has $100.3 billion a year of revenue and $96.8 billion of spending (measured in the run's budget records).

Three payments, by record:

- **A staffer's pay against its line.** A county aide, `person_1779ed27326764ae`, was paid 23 times from March 4, 2025 to January 20, 2026, $38,626.12 in all, each payday filed against the county's administration line (measured). At the April 1 close, `treasury-month:county:26043:2025-04-01`, that line owed $358,037.53. $18,768.00 had gone to staff in town, $3,877.19 went to the town's professional firms and $335,392.34 went outside.
- **A transfer to the town.** `treasury-aid:US-MI:place:2659220:intergovernmental:2025-02-01` moved $500,049.44 from Michigan's treasury to Norway's (measured). `treasury-aid:US:place:2659220:federalAid:2025-02-01` moved $69,289.50 from the U.S. treasury.
- **A benefit after the federal cut.** In Lydia, `retirement-claim:person_6ee8931cace2b343@2025-11-27` paid $1,796.49 and `retirement-claim:person_6ee8931cace2b343@2025-12-27` paid $1,268.59 (measured). That is 70.6% of the award, the federal Social Security line's share of its base after Congress's cut (`src/core2/budgets-treasury.ts:516`).

Every one of the 27,936 journal entries in Norway and the 24,197 in Lydia posted both sides and summed to zero (measured).

## Other fixes in this change

Each is read in code; the runs did not single any of them out.

- Taxes are now withheld from the pay of townspeople the game tracks only as counts, each month, as they are from people it tracks one by one (money audit defect 4; `src/core2/modules/budgets.ts:1076`).
- A withholding record is kept only after its payment posts (defect 16), and lists only the taxes that reached a treasury (defect 11; `src/core2/modules/budgets.ts:1001`).
- A staffer is hired only if the budget line their pay draws on has room for a year of it (defect 19; `src/core2/modules/staff.ts:187`).
- The paid-leave premium is capped by the cash it is taken from (defect 15; `src/core2/law-reach/group-a-money.ts:130`).
- A bribe is recorded once the money moves (defect 17; `src/core2/modules/corruption.ts:212`).
- Poll costs are filed as polls, not ads (defect 18; `src/core2/modules/campaigns.ts:1351`).
- The notice of an adopted budget names who adopted it: the body's vote or the carry-forward rule (laws audit defect 12, the budgets part; `src/core2/modules/budgets.ts:880`).
- The balanced-budget act no longer cuts federal interest on the debt (laws audit defect 9; `src/core2/law-reach/group-b-money.ts:425`).

## What happens next

- **OPUS-CORE**, three changes, each a registered stopgap until then:
  - Let the finance engine change an existing Social Security award's amount (`src/core2/finance-state.ts:744`). In Lydia 5 retirees the game tracks one by one kept their old amount (SG-GOV-opening-award-level).
  - Do the same for the townspeople tracked as counts. In Lydia 832 who claimed during play kept their old amount (SG-GOV-counted-social-security-level).
  - Pay the town's schools, police and fire from their treasury rather than from outside (SG-GOV-public-employers-outside).
- **The other OPUS-GOV builder** (legislature): a county with no executive still passes a budget bill with no lines. `departmentRequests` (`src/core2/modules/budgets.ts:805`) now returns the lines such a bill can carry.
- **This builder, next:** state surpluses build up where the Census shows more revenue than spending. A rainy-day reserve or a larger next budget should take them.

## Method

Both worlds were the played world: `buildBenchWorld`, every module, two-level population, bookkeeping off. Norway, Michigan (place 2659220) was drawn from all 56 by clock seed 1791952403553 and ran 365 days. Lydia, South Carolina (place 4543135) is the laws audit's seed, 1791948706110-ab2db744ab80, run 400 days so Congress's December vote falls inside. A script outside the repository hooked the journal's posting door and summed each treasury's postings by source. Lydia's day 390 came at 82 seconds on this branch and 81 seconds on main, one process at a time.
