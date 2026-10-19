# State treasuries fill up with a year of revenue and spend almost none of it

You need to decide what a state treasury should spend in a played town. In Cutten, California, the state treasury starts the year at $0 and ends it at $541.6 billion. That is about 7,800 times the $69.4 million every person and business in town started with. Each month, each state, county and city treasury receives a twelfth of its government's yearly revenue and pays almost nothing out. The books balance to the cent only because the outside world is recorded as owed every dollar. In Cutten, all 1,518 officials outside the town started at $0 with no job. This audit confirmed 19 defects.

## Where the money comes from, and where it goes

In Pike Creek, Delaware, the year went like this (measured):

- The town's people, businesses and banks opened with $397.7 million.
- During the year, buyers, sellers and governments outside the town paid in $15.9 billion and took out $335 million.
- $15.4 billion of that came in 24 payments labeled "outside revenue," one a month to each of the state and county treasuries.
- The town ended the year holding $16.0 billion, 40 times its opening cash. That is the $397.7 million it started with plus $15.6 billion owed to the outside world.

In Cutten, California, the 24 outside-revenue payments brought $542.6 billion (measured). About $541.6 billion went to the California treasury and about $1.0 billion to the Humboldt County treasury. The only cash a treasury paid out because of a budget line was law-driven assistance benefits: 18 payments, $8.0 million in all (measured).

Why: each month the budgets engine pays every non-federal treasury a twelfth of its government's whole Census-based yearly revenue from the outside account (`src/core2/modules/budgets.ts:493`). That inflow is a registered stopgap, SG-GOV-outside-revenue-monthly. Nothing pays out the matching spending (read in code). A search of the game code for every reader of a budget's spending figure (`spendingMinor`) found one that turns it into a payment: the assistance benefit at `src/core2/law-reach/group-b-money.ts:311`. Every other reader only sizes a number or rewrites a table row.

Counted residents (the wider population that is not followed one by one) show a milder version. All their money sits in one pooled account per place. In Cutten that pool grew from $8.6 million to $86.9 million (measured). Each counted household also carries a figure for its share of the pool, used when it moves away or is filled in as a full person. Those share figures fell by $109,597 in Cutten and $152,578 in Pike Creek (measured). They are shares, not money, so the gap is not a leak (`src/core2/modules/residents.ts:1334-1337`). Two pools for neighboring places in Cutten opened with every share at zero and ended the year holding $39.7 million and $2.3 million (measured). Nobody filled in from those places can take any of that money (inferred from `residents.ts:1402`).

## Did the world balance every month

Yes, to the cent, in all 13 monthly closes of each world (measured). Every person's and organization's cash was compared each day with that day's journal lines, and none changed by a different amount. No cash holder appeared or disappeared holding money. A search for direct writes to cash fields found only opening-day setup and the counted share figure described above (measured).

## Every money flow

"Balanced" means both sides post in one journal entry, and the verifier read the posting line.

| Flow                                                        | Verdict          | Note                                          |
| ----------------------------------------------------------- | ---------------- | --------------------------------------------- |
| Wages for full workers (payroll, hourly, legacy)            | balanced         |                                               |
| Wages for counted workers                                   | balanced         | paid into the place's pooled account          |
| Payroll withholding (income tax, Social Security, Medicare) | balanced         | counted workers never withheld (defect 4)     |
| Paid-leave premium                                          | balanced         | cap reads the wrong balance (defect 15)       |
| Rent, full and counted households                           | balanced         |                                               |
| Mortgage payments                                           | balanced         | counted loans shrink unpaid (defect 5)        |
| Arrears payments and home purchases                         | balanced         | full loan on a short down payment (defect 14) |
| Property tax collected and sent to treasuries               | balanced         | shortfalls vanish (defect 12)                 |
| Sales tax                                                   | balanced         | shortfalls vanish (defect 13)                 |
| Outside revenue to state, county and city treasuries        | balanced         | never spent (defect 1)                        |
| Social Security and unemployment benefits                   | balanced         |                                               |
| SNAP and Medicaid payments                                  | not built        | registered stopgaps say so                    |
| Assistance benefits set by law                              | balanced         |                                               |
| Household spending at local businesses                      | balanced         |                                               |
| Outside customers and outside suppliers                     | balanced         |                                               |
| Owner draws                                                 | balanced         |                                               |
| Bank loans, repayments and interest                         | balanced         |                                               |
| Business credit lines and their interest                    | balanced         |                                               |
| Public staff and appointee pay                              | balanced         | no budget check (defect 19)                   |
| Federal spending                                            | none             | the U.S. treasury only receives (defect 2)    |
| Campaign donations, ads and polls                           | balanced         | polls filed as ads (defect 18)                |
| Interest-group dues, bribes, drive donations                | balanced         | bribe recorded before paid (defect 17)        |
| Fees and fines                                              | not built        | none exist                                    |
| Births                                                      | balanced         | newborns start at $0                          |
| Deaths of full people                                       | left on the dead | no inheritance (defect 6)                     |
| Deaths of counted people                                    | balanced         | the share passes to a housemate               |
| Full person moves away                                      | left in town     | cash stays on their record (defect 8)         |
| Counted household moves away                                | balanced         | pays its share to the outside world           |
| Filling in a counted person                                 | balanced         | zero-share pools give nothing (defect 10)     |
| Business closings                                           | balanced         | a dead owner can be paid (defect 7)           |

No flow moves cash around the journal. Every defect below is a payment that is missing or the wrong size, or a record that disagrees with the money.

## Confirmed defects

Each line is one bug a fixer could take. The Sonnet verifier confirmed every one against the code. "Read in code" means the path was confirmed in the code but not isolated in the run.

| #   | Defect                                                                                                                       | Where                                                           | Evidence                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | State, county and city treasuries receive a year of revenue and pay out almost none of it                                    | `src/core2/modules/budgets.ts:493`                              | measured: `organization:treasury:US-CA` from $0 to $541.6 billion, reason `outside-revenue`, every month from February 1, 2025  |
| 2   | The U.S. treasury collects withholding and never pays anything out                                                           | `budgets.ts:478`                                                | read in code                                                                                                                    |
| 3   | The dollar test (M0-08) accepts any amount owed to the outside world, and its test world has no budgets engine               | `scripts/core2-year/closures.mjs:136`                           | measured: both worlds balance while owing $15.6 billion and $542.7 billion outside                                              |
| 4   | Counted workers' income tax is never withheld, though outside revenue assumes the town's own payroll pays the town's share   | `budgets.ts:930-931`                                            | read in code                                                                                                                    |
| 5   | A counted household's mortgage balance falls every month whether or not it was paid                                          | `src/core2/modules/housing.ts:635-645`                          | read in code                                                                                                                    |
| 6   | A full person's cash stays on their record when they die; nobody inherits it                                                 | `src/core2/modules/health.ts:334`                               | read in code                                                                                                                    |
| 7   | A closing business whose dead owner has no living housemate pays its proceeds to the dead owner                              | `src/core2/modules/business.ts:371-374`                         | read in code                                                                                                                    |
| 8   | A full person who moves away keeps their cash in the town's books, while counted movers pay theirs out                       | `src/core2/modules/moves.ts:470`                                | measured: in Cutten, the 152 inactive records (relatives living elsewhere plus people who moved away) held $660,789 at year end |
| 9   | All officials outside the town open with $0, no job and no pay, though the stopgap that promised them pay is marked resolved | `src/core2/data/stopgaps.json`, SG-CORE-identity-fill-in-traits | measured: in Cutten, 1,518 of 1,518 at $0                                                                                       |
| 10  | A counted pool whose households all opened with a zero share can never pay out what it receives                              | `src/core2/modules/residents.ts:1402`                           | measured pools of $39.7 million and $2.3 million; payout inferred                                                               |
| 11  | Withholding lines with no matching government are skipped, but the record still lists them as withheld                       | `budgets.ts:961`                                                | read in code                                                                                                                    |
| 12  | Unpaid property tax disappears, with no arrears and no record                                                                | `src/core2/housing-property-tax.ts:134`                         | read in code                                                                                                                    |
| 13  | Sales tax a short seller cannot remit disappears, with no arrears and no record                                              | `src/core2/modules/purchase-tax.ts:116`                         | read in code                                                                                                                    |
| 14  | A home buyer short of the down payment still gets the full mortgage                                                          | `housing.ts:822`                                                | read in code                                                                                                                    |
| 15  | The paid-leave premium is capped by total cash but taken from spendable cash, so it can exceed what is spendable             | `src/core2/law-reach/group-a-money.ts:128-131`                  | read in code                                                                                                                    |
| 16  | Withholding records are written before the payment posts, so a failed payment leaves records of money that never moved       | `budgets.ts:953`                                                | read in code                                                                                                                    |
| 17  | A bribe is recorded as taken before the money moves                                                                          | `src/core2/modules/corruption.ts:207-213`                       | read in code                                                                                                                    |
| 18  | Poll costs are filed under the ad-buy kind                                                                                   | `src/core2/modules/campaigns.ts:1349`                           | read in code                                                                                                                    |
| 19  | Public staff and appointees are paid with no check against any budget line                                                   | `src/core2/modules/staff.ts:145-157`                            | read in code; partly covered by SG-P8-public-payroll-due-flow                                                                   |

Not counted as defects: the bank's opening capital has no payer, but no opening balance anywhere has one. The property-tax fallback that pays the outside account runs only when the budgets engine is absent.

## What came back clean

Wages, rent, mortgage payments, sales and property tax collection, Social Security, unemployment, law-driven assistance, household spending, outside customers and suppliers, owner draws, every kind of bank lending and interest, campaign money, dues, bribes and donations all post both sides in one entry.

## What the agents could not reach

- Whether anyone is actually filled in from defect 10's pools in play; the run did not log fill-ins by place.
- Why the two neighboring pools in Cutten fill up at all, possibly commuters' wages with no spending there; not traced.
- The older simulation engine under `src/simulation/`, which keeps its own budget arithmetic.
- Payments that end with a household's standing contracts when someone moves away.

## What happens next

The decision above comes first: paying budget lines out as cash to the outside world would stop defect 1, at a speed cost not yet measured. Defects 1 to 3 go to OPUS-GOV and OPUS-CORE. Defects 4, 11, 16 and 19 go to OPUS-GOV. Defects 5, 10, 12, 13 and 14 go to OPUS-WORLD. Defects 6 to 9 go to OPUS-PEOPLE and OPUS-CORE. Defects 15, 17 and 18 are small and suit the fixer. Nothing was fixed here; the audit changed no game code.

## Who did the work

| Model  | Agents          | Job                                                          | Tokens                                     | Time                                           |
| ------ | --------------- | ------------------------------------------------------------ | ------------------------------------------ | ---------------------------------------------- |
| Haiku  | 10, all at once | traced one money flow each, read-only                        | 1,344,955 in all (102,312 to 174,714 each) | 80 to 229 seconds each; about 4 minutes in all |
| Sonnet | 1               | checked every claim against the code                         | 124,382                                    | 153 seconds                                    |
| Sonnet | 1               | reviewed this report                                         | 137,666 over 4 passes                      | 117 seconds over 4 passes                      |
| Opus   | 1               | planned, ran both years, spot-checked 3 verdicts, wrote this | not visible                                | about 40 minutes                               |

Of the verifier's verdicts, three were checked a second time by Opus (defect 1, defect 5, and the counted-death code described under "Where the money comes from"); all three held.

## Method

|                                         | World 1                              | World 2                            |
| --------------------------------------- | ------------------------------------ | ---------------------------------- |
| Place                                   | Pike Creek, Delaware (place 1056490) | Cutten, California (place 0617722) |
| Seed                                    | `clock:1791949359448`                | `clock:1791949572079`              |
| Full people at opening                  | 1,798                                | 1,726                              |
| Counted residents at opening            | 42,501                               | 38,526                             |
| Journal entries in the year             | 18,749                               | 22,791                             |
| Entries whose lines did not sum to zero | 0                                    | 0                                  |
| World build, then one year              | 70 s, then 110 s                     | 52 s, then 86 s                    |

Both worlds were built as the player gets them (every module installed, two-level population), in places drawn at random from all 56 states and territories, and ran from January 20, 2025, to January 20, 2026, on head `fd3574c9`. A scratch script outside the repository hooked the journal's one posting door and counted every person's, organization's and outside account's cash each day, with the debug checks off as in play.
