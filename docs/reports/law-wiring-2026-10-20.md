# Laws now reach people and move money in play, but none passes all nine checks yet

In a played year, more laws now name the people they reached and the money they moved. In Sobieski, Wisconsin, 7 of the 12 laws passed in play recorded the money they moved, up from none. In Williamsburg, Ohio, 5 of 11 reached someone and 2 recorded money. Graded on all nine links with every family fix except housing applied, 1 of the 89 laws passes every link, 9 are complete apart from registered stopgaps, and 79 are still partly wired. The biggest remaining gaps are repeal (35 laws) and the outcome web (19 laws missing, 45 stopgapped as unresearched).

## A played year, before and after

The same two places, drawn at random from all 56, each played one year (`scripts/law-wiring/year.ts`). "Before" is main at the audit. "After" is main with the government, labor, prices, justice, taxes and health families applied; the rights and housing families are not in this run. The counts are enactments that bodies passed in play; repeals are not counted.

| Place (seed)                                       | Laws passed | Reached anyone | Engine recorded the money | Moved an outcome measure |
| -------------------------------------------------- | ----------- | -------------- | ------------------------- | ------------------------ |
| Williamsburg, Ohio (578d295134ffab75db90), before  | 6           | 3              | 0                         | 2                        |
| Williamsburg, Ohio, after                          | 11          | 5              | 2                         | 2                        |
| Sobieski, Wisconsin (d0870cb398c762fdc120), before | 12          | 10             | 0                         | 2                        |
| Sobieski, Wisconsin, after                         | 12          | 10             | 7                         | 2                        |

Bodies in play passed different laws in the two runs, because the changed engines change what officials face. That is why Williamsburg passed 11 laws after, against 6 before. The laws that reached no one after the fixes did so for these reasons:

- Civilian oversight was in force only 7 days, before the monthly public-safety run read it.
- Ohio's state immigration row was replaced by the city's own row the same month.
- Clean electricity was enacted twice, and only the second enactment reached people.
- The housing laws wait on the housing family.

Earlier versions of this report counted repeals as laws that took effect (18 and 26). Those numbers are replaced here.

The year files are `docs/reports/law-wiring/year-before-*.json` and `year-after-*.json`.

## Where things stand

The grades come from two other towns drawn at random: Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8). Both were graded on main with the government, labor, taxes, health and rights families merged in; the prices and justice families were already on main. Housing is not included. The counts are laws, out of 89.

| Link                                | Wired | Partial | Missing | Stopgap |
| ----------------------------------- | ----- | ------- | ------- | ------- |
| 1. Exists in all 56 places          | 88    | 0       | 1       | 0       |
| 2. A body can enact and repeal it   | 88    | 0       | 1       | 0       |
| 3. Reaches people and organizations | 53    | 15      | 13      | 8       |
| 4. Read by the engine it changes    | 52    | 21      | 11      | 5       |
| 5. Moves money                      | 83    | 0       | 3       | 3       |
| 6. Moves its outcome-web measures   | 16    | 9       | 19      | 45      |
| 7. People learn of it by a read     | 80    | 0       | 9       | 0       |
| 8. Repeal stops it                  | 54    | 0       | 35      | 0       |
| 9. Same code path everywhere        | 60    | 8       | 21      | 0       |

Before the fixes, money was wired for 44 laws and reach for 40. Now money is wired for 83 and reach for 53. A "stopgap" is a registered stopgap that names the missing piece; it is not wiring, and it stays on the list to clear. The row-by-row grades, with evidence and reasons, are in `docs/reports/law-wiring-table.md` and `docs/reports/law-wiring-matrix.json`.

## Why the rest is not green

- **Repeal, 35 laws.** For 21 of them, nothing was reached, so there was nothing for a repeal to stop. These are the housing and credit laws, the farm and gas-hookup laws, the juvenile court age, home rule, the corporate, estate and inheritance taxes, and the starting authorities. The other 14 are amounts and budget lines: the payroll, income, sales and property taxes, the SNAP maximum, the Medicaid match, and the police, fire, corrections, parks and administration lines. For these, the checker's "repeal" puts back the opening amount. That amount is still a law that applies to the same people, so the reach rows rightly stay open. The checker grades that as missing. The right check for an amount is that the money goes back to its opening level. That grader change is next.
- **The outcome web, 64 laws.** 45 are stopgapped under `SG-LAW-outcome-link-unresearched` (`src/core2/data/laws/outcome-research-gaps.json`), which lists the outcome each law's research would measure. Another 19 have built links that did not move their measure within the 35-day run, or links whose research puts the effect at about zero. The outcome web belongs to EFFECT-WEB-WIRING (#5557, #5563, #5564, #5567), so this audit did not edit it.
- **The engine-read link, 32 laws.** For 21 laws, only the law-reach handler reads the law at the moment it applies. Examples are Medicaid work requirements, universal preschool, voucher funds, the voting laws and the fiscal rules. The handler moves the money, but no other engine reads the law when it decides. For 11 laws, the table trace found no engine reading them. These include the three minimum wage laws, the corporate, estate and inheritance taxes, and home rule. The minimum wage still raised payroll in an earlier run, so the trace may be missing a read the payroll engine makes another way. That cause was not found.
- **Reach, 28 laws.** For 8 laws, the law reached people in one drawn town and not the other. These include concealed carry, stand your ground, the bottle deposit and the property tax cap. Where the town had no one the law covers, that is a fact of the place, not a defect. Seven laws name full people but no counted group, so they don't meet the "one model, two tiers" rule. These include the lobbying ban, term limits, ward lines, public-sector bargaining and the local wage authority. The corporate, estate and inheritance taxes, and the unemployment weekly maximum, reached nobody in the 35-day window. For the estate and inheritance taxes, nobody in either town died with an estate in that window. The corporate tax was not traced to a cause; the next check is whether it pays only at year end.
- **Knowing, 9 laws.** These are budget lines changed directly by the checker. In play, a budget line changes when a bill passes, and the bill's passage is the news story.
- **One law has no starting row.** The public pay floor has no row in any of the 56 places, and no bill can change the local income tax authority.

## The family pull requests

| Family                                           | Pull request   | State       |
| ------------------------------------------------ | -------------- | ----------- |
| Audit, checker and shared applied record         | #5547          | merged      |
| Prices and sales taxes                           | #5629          | merged      |
| Justice                                          | #5642          | merged      |
| Government and elections                         | #5582          | open, ready |
| Labor and pay                                    | #5589          | open, ready |
| Taxes and public finance                         | #5649          | open, ready |
| Health, assistance and schools                   | #5652          | open, ready |
| Rights, technology, environment, farms and parks | #5669          | open, ready |
| Housing and credit                               | not yet opened | in progress |

The open pull requests touch some of the same files. When one merges, the others need main merged in, and two of them need a duplicate `lawApplied` import removed: `employer-taxes.ts` (taxes after labor) and `group-a-money.ts` (labor after rights). A local merge of all of them typechecks once those are resolved.

## Method

The checker (`scripts/law-wiring/check.ts`) builds each drawn place twice. In the first world it changes one law the day after the opening. In the control world a null law that no engine reads takes effect on the same day, so news and the outcome web's same-day run cancel out. The checker then runs both worlds 35 days and compares them. Reads come from a table trace and money from a cash-journal trace, both off in play. It then repeals or restores the law and runs 10 more days. `scripts/law-wiring/matrix.ts` grades the nine links and writes the matrix.
