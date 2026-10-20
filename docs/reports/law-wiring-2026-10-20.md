# Laws now reach people and move money in a played year; 18 of 89 laws are complete or covered by a registered stopgap

With all eight law families merged together, 13 of the laws passed in a played year in Williamsburg, Ohio, and 8 of them reached someone, against 6 and 3 before the work. In Sobieski, Wisconsin, 13 of 14 reached someone and 9 recorded the money they moved, where no law recorded money before. Graded on all nine links, 1 law passes every link, 17 are complete apart from registered stopgaps, and 71 are still partly wired. The grading itself isn't green: the matrix still has open links on 71 laws, and their reasons are below.

## A played year, before and after

The same two places, drawn at random from all 56, each played one year (`scripts/law-wiring/year.ts`). "Before" is main at the audit. "After" is main on October 20 at 18:00 UTC with every family merged in: health (merged), government, labor, taxes, rights, and housing (all open). The counts are enactments that bodies passed in play; repeals are not counted.

| Place (seed)                                       | Laws passed | Reached anyone | Engine recorded the money | Moved an outcome measure |
| -------------------------------------------------- | ----------- | -------------- | ------------------------- | ------------------------ |
| Williamsburg, Ohio (578d295134ffab75db90), before  | 6           | 3              | 0                         | 2                        |
| Williamsburg, Ohio, after                          | 13          | 8              | 6                         | 3                        |
| Sobieski, Wisconsin (d0870cb398c762fdc120), before | 12          | 10             | 0                         | 2                        |
| Sobieski, Wisconsin, after                         | 14          | 13             | 9                         | 3                        |

Bodies passed different laws in the two runs, because the changed engines change what officials face. Williamsburg's year took 162 s before and 141 s after; Sobieski's took 70 s before and 75 s after. These are two runs sharing one machine, not the speed guard's one-process measurement. The year files are `docs/reports/law-wiring/year-before-*.json` and `year-after-*.json`.

## The matrix, all families together

Two other towns were drawn at random: Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8). Both were graded on the same integration of main and every family. The counts are laws, out of 89.

| Link                                | Wired | Partial | Missing | Stopgap |
| ----------------------------------- | ----- | ------- | ------- | ------- |
| 1. Exists in all 56 places          | 88    | 0       | 1       | 0       |
| 2. A body can enact and repeal it   | 88    | 0       | 1       | 0       |
| 3. Reaches people and organizations | 57    | 16      | 13      | 3       |
| 4. Read by the engine it changes    | 52    | 21      | 11      | 5       |
| 5. Moves money                      | 83    | 0       | 3       | 3       |
| 6. Moves its outcome-web measures   | 16    | 9       | 19      | 45      |
| 7. People learn of it by a read     | 80    | 0       | 9       | 0       |
| 8. Repeal stops it                  | 67    | 0       | 22      | 0       |
| 9. Same code path everywhere        | 63    | 10      | 16      | 0       |

These are the changes since the audit:

- Reach is wired for 57 laws, up from 40.
- Money is wired for 83, up from 44.
- Repeal is wired for 67, up from 47.

The law that passes every link is abortion restriction. The 17 that are complete apart from stopgaps:

- the price laws: fare-free transit, the mileage fee, public broadband and the carbon price;
- the payroll taxes and the sales tax;
- the multifamily, inclusionary and gas-hookup rules;
- paid family leave and right to work;
- the discrimination ban, age verification and data privacy.

A stopgap is a registered missing piece, not wiring. The row-by-row grades, with evidence and reasons, are in `docs/reports/law-wiring-table.md` and `docs/reports/law-wiring-matrix.json`.

## Why the rest is not green

- **Repeal, 22 laws.**
  - **Nothing to stop (16 laws):** they reached nobody in either town in the 35-day window. These include rent stabilization and right to counsel (no lease anniversary or eviction hearing fell in the window), the corporate, estate and inheritance taxes, the unemployment amounts, the juvenile court age, and the starting authorities.
  - **Rows still citing the changed amount (6):** income tax and the police, fire, corrections, administration and parks lines. After the old amount is put back, some rows still cite the changed amount. For the budget lines, `endReplaced` does nothing for a key containing ":" (`src/core2/law-reach/host.ts`). Their rows are re-pointed only when the staffing engine next acts on that employer, and some people hired under the raise were still employed when the window closed. Why some income-tax rows still cite the changed row was not found.
- **Reach, 29 laws.**
  - **One town only (10):** they reached people in one town and not the other, for example concealed carry, the property tax cap and the bottle deposit. Where the town has no one the law covers, that is a fact of the place.
  - **Full people only (6):** they name full people but no counted group, so they don't meet "one model, two tiers". These include the lobbying ban, term limits, ward lines and public-sector bargaining.
  - **No record of anyone reached (13):** the corporate, estate and inheritance taxes, the unemployment amounts, home rule, the juvenile court age and the starting authorities.
- **Engine read, 32 laws.** For 21 of them, the law-reach handler is the only reader. It moves the money, but no other engine reads the law when it decides. Examples are the voting laws, the Medicaid and work-requirement laws, preschool, vouchers and the fiscal rules. For 11, the table trace found no reader at all. These include the three minimum-wage laws, although they did raise pay in play, so the trace may be missing a read. That cause was not found.
- **Outcome web, 64 laws.** 45 are covered by `SG-LAW-outcome-link-unresearched` (`src/core2/data/laws/outcome-research-gaps.json`). For 19, the built links did not move their measure in 35 days, or the research puts the effect near zero. The web belongs to EFFECT-WEB-WIRING, so this audit did not edit it.
- **Knowing, 9 laws.** These are budget lines changed directly by the checker. In play a line changes when a bill passes, and the bill is the news story.
- **The public pay floor** has no starting row in any place, and no bill can change the local income tax authority.

## The family pull requests

| Family                                                  | Pull request | State       |
| ------------------------------------------------------- | ------------ | ----------- |
| Audit, checker and shared applied record                | #5547        | merged      |
| Prices and sales taxes                                  | #5629        | merged      |
| Justice                                                 | #5642        | merged      |
| Health, assistance and schools                          | #5652        | merged      |
| Government and elections                                | #5582        | open, ready |
| Labor and pay                                           | #5589        | open, ready |
| Taxes and public finance                                | #5649        | open, ready |
| Rights, technology, environment, farms and parks        | #5669        | open, ready |
| Housing and credit                                      | #5688        | open, ready |
| Group B work-requirement test (red on main after #5652) | #5732        | open, ready |

The mergers sent back three of these, and each is fixed and pushed:

- **Government:** the staffing raise now funds a whole position.
- **Labor:** the checks fail when nothing is found.
- **Taxes:** the loosened group-B assertions are restored.

Each open branch has main merged in as of 18:00 UTC.

The families touch shared import lists, so the one that lands second needs a small resolution:

- labor and taxes: `counted-money.ts` and `legislature.ts`;
- rights and housing: `group-a-money.ts` and `group-a.ts`;
- anything after government: `onReachCalendar` and `onReachPayroll` move to `law-reach/reach-workers.ts`.

Government's two load-order fixes (`reach-workers.ts` and `voting-keys.ts`) stop a module from being read before it has loaded. Before them, with turnout-web on main, the staffing workers were not registered at all.

## Method

The checker (`scripts/law-wiring/check.ts`) builds each drawn place twice. In the first world it changes one law the day after the opening. In the control world a null law that no engine reads takes effect on the same day, so news and the outcome web's same-day run cancel out. The checker then runs both worlds 35 days and compares them. Reads come from a table trace and money from a cash-journal trace, both off in play. It then repeals or restores the law and runs 10 more days. `scripts/law-wiring/matrix.ts` grades the nine links and writes the matrix.
