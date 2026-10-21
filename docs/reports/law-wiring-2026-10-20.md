# Most laws take effect and change nothing a player can follow to a person or a dollar

When a law takes effect, people hear about it on the news, but for most laws nothing else follows. Of the 89 laws the game has, none yet passes all nine wiring checks. The worst gap is reach: a law in force often names no one it applies to, even where an engine quietly reads it. Inclusionary zoning, the right to counsel in eviction, rent stabilization and the consumer loan rate cap all show this. Money and the outcome web follow the same pattern. The fixes are under way, one family of laws per pull request, and this report and its matrix are updated as each one lands.

## A played year, before the fixes

Two places drawn at random from all 56 places each played one year on current main (`scripts/law-wiring/year.ts`). Bodies in play passed every law that took effect.

| Place (seed)                                    | Laws that took effect | Reached anyone | Engine recorded money against it | Moved an outcome measure |
| ----------------------------------------------- | --------------------- | -------------- | -------------------------------- | ------------------------ |
| Sobieski, Wisconsin (seed d0870cb398c762fdc120) | 18                    | 13             | 0                                | 5                        |
| Williamsburg, Ohio (seed 578d295134ffab75db90)  | 26                    | 5              | 0                                | 8                        |

In Williamsburg, rent stabilization took effect five times and reached no one each time. The right to counsel in eviction, the multifamily rule, the shift of highway funds to transit and the state's minimum wage raise also reached no one. "Engine recorded money" counts the record each engine now writes when it applies a law with money. Main has no such record yet, so a zero there means no engine named the money a law moved, not that no money changed hands. The same two seeds are run again once the family fixes land.

## Where things stand

Grades come from two towns drawn at random from all 56 places: Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8). Each world was built the way the game builds it: two levels of population, with the economy on. All 89 laws were measured in both towns. These are the grades before any family fix lands.

| Link                                | Wired | Partial | Missing | Stopgap |
| ----------------------------------- | ----- | ------- | ------- | ------- |
| 1. Exists in all 56 places          | 88    | 0       | 1       | 0       |
| 2. A body can enact and repeal it   | 88    | 0       | 1       | 0       |
| 3. Reaches people and organizations | 40    | 14      | 19      | 16      |
| 4. Read by the engine it changes    | 39    | 18      | 16      | 16      |
| 5. Moves money                      | 44    | 0       | 25      | 20      |
| 6. Moves its outcome-web measures   | 16    | 9       | 39      | 25      |
| 7. People learn of it by a read     | 80    | 0       | 9       | 0       |
| 8. Repeal stops it                  | 47    | 0       | 42      | 0       |
| 9. Same code path everywhere        | 51    | 3       | 35      | 0       |

Counts are laws, out of 89. "Stopgap" means a registered stopgap already names the missing piece. That is not wiring, and each stopgap stays on the list to clear.

The full row-by-row grades, each with its evidence and the reason a link is missing, are in `docs/reports/law-wiring-table.md` and `docs/reports/law-wiring-matrix.json`.

## Why the links are missing

- **Reach is not recorded where the law is applied.** Several laws are read by an engine at the moment it decides, but that engine records no one. This is measured. The housing engine reads inclusionary zoning and the multifamily rule at its construction decision (`src/core2/modules/housing.ts`). The housing engine also reads the right to counsel. Lease renewal reads rent stabilization (`src/core2/housing-occupancy.ts`). The credit engine reads the loan rate cap at quotation (`src/core2/modules/credit.ts`). In each case the law-reach mechanic list is empty (`src/core2/law-reach/group-a.ts:29-34`), so no reach record names anyone. That is why the October 19 sim check found zero people reached in Lemon Grove, California.
- **Prices are paid but not traced to payers.** The price laws (fare-free transit, the mileage fee, public broadband, the clean electricity standard, the bottle deposit and the carbon price) change prices at monthly settlement. The law-reach handler returns before recording anyone (`src/core2/law-reach/group-b.ts:290-292`). This is measured: in both towns the money moved and no reach row exists.
- **Some laws are recorded and read by nobody.** Sixteen group-A policies only write a record on the people they name (mechanic "none", `src/core2/law-reach/group-a.ts:27`). No engine reads those records when it decides or pays. Examples are civilian police oversight, the juvenile court age, the handgun purchase age and facial recognition limits. This is measured by the table trace.
- **The minimum wage as an amount names no one.** In Prescott, raising it from $10.33 to $11.36 an hour raised payroll by 2 percent. The checker found no record of which workers were raised (`src/core2/data/laws/reach-group-a.json`, an empty reach list for `minimum-wage`). This is measured.
- **The raise-the-minimum-wage question changes no pay.** It reached 34 workers by record in Prescott. Neither town shows an engine that read it or a dollar that moved. This is measured.
- **Eleven tax and benefit amounts could not be changed by any bill.** These are the property, corporate, estate and inheritance taxes, the payroll taxes, the federal Medicaid match, the SNAP maximum and the unemployment amounts. Each had a starting row but no bill catalog entry. This is now fixed on this branch (`scripts/research/build-bill-catalog.py`). The public pay floor still has no starting row in any of the 56 places.
- **The outcome web has 118 researched links that start from a law.** Of those, 72 are built, 28 are about zero by their research, 11 have no outcome the web produces, 8 have no researched size and 2 have no recorded cause (`data/research/outcome-web/links.json`). Many built links did not move their measure in the run. Each one's reason is in the table.
- **A budget change made directly is not news.** A budget line amended outside a bill emits its event with news off (`src/core2/modules/budgets.ts:1409`). In play, a line changes when a bill passes, and the bill's passage is the story. The knowing link for budget lines is checked through that route once the budget family's test runs it.

## Family fixes so far

- Government and elections, #5582: the four voting laws reach named voters and counted groups. The county, city or state pays to mail ballots, issue IDs and register voters out of its administration line. Term limits, the lobbying ban, home rule and ward lines record whom they applied to.
- Labor and pay, #5589: every minimum wage raise names the workers it raised, full and counted. Payroll taxes name each worker and employer with the tax. Unemployment benefits are paid from the state fund, and counted claimants are paid times the people they stand for.
- Prices and sales taxes, #5629: the price laws record each household, counted group, seller and treasury they charged or paid at the monthly settlement. The grocery exemption now spares tax on groceries; before, it matched no seller. The sales tax names its buyers and sellers.
- Justice, #5642: a monthly public-safety engine runs the town's ordinary crime through arrest, court, bail, jail and prison under the laws in force. It counts arrests by group and never names a person by age alone. Firearm laws reach gun-owning households with their costs and fees. Oversight and immigration partnership cost the city and county. The police, fire and corrections lines set service.
- In progress: housing and credit, health and schools, taxes and public finance, and rights, environment, farms and parks.

## What happens next

The laws are split into eight families, each fixed on its own pull request with one test per law in a drawn place:

- labor and pay;
- housing and credit;
- prices and sales taxes;
- government and elections;
- health, assistance and schools;
- taxes and public finance;
- justice;
- rights, technology, environment, farms and parks.

Each family's engine records whom it applied a law to through one shared record, `lawApplied` in `src/core2/law-reach/applied.ts`. A repeal ends those records, and the bench's reached-step check and the people's law history read them. This matrix is rebuilt after each family lands. A played year in two new random places then gives the before and after counts at the top of this report.

## Method

The checker (`scripts/law-wiring/check.ts`) builds each drawn place twice. In the first world it changes one law the day after the opening. In the control world a null law that no engine reads takes effect on the same day, so news and the outcome web's same-day run cancel out. The checker then runs both worlds 35 days and compares them. Reads come from a table trace and money from a cash-journal trace, both off in play. It then repeals or restores the law and runs 10 more days. `scripts/law-wiring/matrix.ts` grades the nine links and writes the matrix.
