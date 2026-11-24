# Treasuries now spend their budgets, and a federal cut lowers a retiree's check

OPUS-CORE needs to make two changes before a federal cut reaches most retirees: let the finance engine change an existing Social Security award, and let the pooled payments of townspeople tracked as counts change too. Until then, a cut reaches only people the game tracks one by one who start Social Security during play. In Lydia, South Carolina, that was 2 people in town, while 837 kept their old amount (measured).

The rest works. Every government treasury now pays its adopted budget each month instead of only collecting. Over 400 days in Lydia, the county treasury paid out $154.4 million of the $176.0 million it took in. Before this change it paid out $395,000.

## Before and after

Before: each month every state, county and town treasury received a twelfth of its yearly revenue from outside the town and paid almost nothing out. The U.S. treasury collected withholding and paid nothing. A federal budget cut changed no one's payment.

After: each treasury pays every line of its budget each month, to people and businesses in town first and the rest outside the town, line by line. A federal cut to Social Security lowers the next check of a retiree the game tracks one by one who claimed during play. They feel it at once, and blame the law only once a story they hear tells them it did it.

## What a treasury does each month

On the first of each month, every treasury (federal, state, county and town) does three things in order (read in code, `src/core2/budgets-treasury.ts:254`):

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
- **A benefit after the federal cut.** In Lydia, `retirement-claim:person_6ee8931cace2b343@2025-11-27` paid $1,796.49 and `retirement-claim:person_6ee8931cace2b343@2025-12-27` paid $1,268.59 (measured). That is 70.6% of the award, the federal Social Security line's share of its base after Congress's cut (`src/core2/budgets-treasury.ts:642`).

Every one of the 27,936 journal entries in Norway and the 24,197 in Lydia posted both sides and summed to zero (measured).

## One dollar to a person: the federal cut in Lydia

Measured in the Lydia run, in order:

1. **The bill.** Congress passed bill 2025-002, a balanced operating budget, on December 15, 2025 (`vote-recorded:vote:2025-002:...`).
2. **The law in force.** `law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002` took effect the same day.
3. **The budget line.** It cut the federal Social Security line to 70.6% of its base (`budget-line-changed:budget:US:2025:socialSecurity:...#balance#2025-12-15`). Interest on the debt was not cut.
4. **The smaller payment.** `person_6ee8931cace2b343`, a retiree in Lydia who claimed during play, was paid $1,796.49 on November 27 and $1,268.59 on December 27. `person_52106326559861a5` was paid $1,616.47 on December 2 and $1,141.47 on January 2.
5. **Their money.** Each payment is a journal entry on their own cash account; the retiree held $22,298.57 at the end of the run.
6. **What they felt.** The cut landed on them as an event with no cause attached (`event:law.effect-landed:2025-12-15:retirement-claim:person_6ee8931cace2b343`). Their mood fell to -0.40 and their stress rose to 0.65 that day; `person_52106326559861a5` fell to -0.39 and rose to 0.64.
7. **Why their view did not move.** Someone ties a smaller check to the law only after learning of it: a story they heard about the law taking effect, or about the Social Security line it changed (`src/core2/budgets-treasury.ts:584`). Then a `law.effect-learned` event names the law, and their stance on it cites that story. In 400 days none of the 29 recipients heard such a story (measured: 29 changes landed, 0 learned). This retiree heard 5 stories, all about county board votes and a business closing. So the retiree knows the check is smaller but not why, and holds no view on the act. The learned step has not yet been seen in a run.
8. **What else did not read it.** No choice they made changed: the game records choices only for the player and the people around them, and this retiree recorded none in 400 days. No drive appears in their records. The story director counts only job wages as household money, so no scene or journal line followed (`src/director/ledger.ts:143`); that part is OPUS-PEOPLE's.

Everyone else in town kept their Social Security amount: 5 retirees from the opening and 832 tracked as counts (see What happens next). The other 27 people who claimed during play and are tracked one by one live outside the town.

## Other fixes in this change

Each is read in code; the runs did not single any of them out.

- Taxes are now withheld from the pay of townspeople the game tracks only as counts, each month, as they are from people it tracks one by one (money audit defect 4; `src/core2/modules/budgets.ts:1080`).
- A withholding record is kept only after its payment posts (defect 16), and lists only the taxes that reached a treasury (defect 11; `src/core2/modules/budgets.ts:1005`).
- Each payday a treasury pays its staff counts against the budget line the post draws on, and the room left on that line leans an official toward or away from hiring, never a flat no (defect 19; `src/core2/modules/staff.ts`, `budgetLean`).
- The paid-leave premium is capped by the cash it is taken from (defect 15; `src/core2/law-reach/group-a-money.ts:130`).
- A bribe is recorded once the money moves (defect 17; `src/core2/modules/corruption.ts:212`).
- Poll costs are filed as polls, not ads (defect 18; `src/core2/modules/campaigns.ts:1351`).
- The notice of an adopted budget names who adopted it: the body's vote or the carry-forward rule (laws audit defect 12, the budgets part; `src/core2/modules/budgets.ts:884`).
- The balanced-budget act no longer cuts federal interest on the debt (laws audit defect 9; `src/core2/law-reach/group-b-money.ts:425`).

## What happens next

- **OPUS-CORE**, three changes, each a registered stopgap until then:
  - Let the finance engine change an existing Social Security award's amount (`src/core2/finance-state.ts:744`). In Lydia 5 retirees the game tracks one by one kept their old amount (SG-GOV-opening-award-level).
  - Do the same for the townspeople tracked as counts. In Lydia 832 who claimed during play kept their old amount (SG-GOV-counted-social-security-level).
  - Pay the town's schools, police and fire from their treasury rather than from outside (SG-GOV-public-employers-outside).
- **OPUS-PEOPLE:** the director counts only job wages as household money, so a cut benefit gets no scene or journal line (`src/director/ledger.ts:143`). The drives data still lists `law.effect-landed` as having no producer (`src/core2/data/drives.json:648`); it has one now.
- **The other OPUS-GOV builder** (legislature): a county with no executive still passes a budget bill with no lines. `departmentRequests` (`src/core2/modules/budgets.ts:809`) now returns the lines such a bill can carry.
- **This builder, next:** state surpluses build up where the Census shows more revenue than spending. A rainy-day reserve or a larger next budget should take them.

## Method

Both worlds were the played world: `buildBenchWorld`, every module, two-level population, bookkeeping off. Norway, Michigan (place 2659220) was drawn from all 56 by clock seed 1791952403553 and ran 365 days. Lydia, South Carolina (place 4543135) is the laws audit's seed, 1791948706110-ab2db744ab80, run 400 days so Congress's December vote falls inside. A script outside the repository hooked the journal's posting door and summed each treasury's postings by source. Lydia's day 390 came at 82 seconds on this branch and 81 seconds on main, one process at a time.
