# Every law is wired or carries a registered stopgap; 7 of 89 pass all nine links outright

With all eight law families merged together, every one of the 89 laws is now graded green or covered by a registered stopgap on each of its nine links:

- 7 pass every link outright: rent stabilization, legal cannabis sales, all-mail voting, automatic voter registration, photo ID to vote, legislative term limits and abortion restriction.
- The other 82 are wired except for links each tied to one of 12 specific stopgaps, listed below with their reasons.

In a played year, Williamsburg, Ohio passed 13 laws and 8 of them reached someone, against 6 and 3 before the work. In Sobieski, Wisconsin, 13 of 14 reached someone and 9 recorded the money they moved, where no law recorded money before.

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

| Link | Wired | Not applicable | Stopgap | Laws | What it covers |
| --- | --- | --- |
| SG-LAW-outcome-link-unresearched | 45 | No researched outcome link starts from the law. |
| SG-LAW-wiring-checker-window | 20 | Even in a 400-day run, the drawn town had no one the law covers, or its event did not occur: no teacher under the floor, no transit line, no polluted county, no estate. Each family test shows the link in its own played world. |
| SG-LAW-wiring-read-in-law-reach | 16 | The law-reach handler applies the law the day it takes effect (the benefit, rule or record); no engine reads the law afterwards in the run. |
| SG-LAW-outcome-not-produced | 9 | A researched link names an outcome the web doesn't produce. |
| SG-LAW-wiring-budget-news | 9 | The checker amends budget lines directly, which is not news; in play the bill is. |
| SG-LAW-outcome-link-not-fired | 8 | Built links did not move their measure in the run. |
| SG-LAW-budget-line-reach-not-ended | 5 | Rows recorded under a raised budget line stay open until staffing next acts, because `endReplaced` skips budget-line keys. |
| SG-LAW-wiring-read-on-drafting | 4 | Authority laws are read only when a body drafts a bill under them, and the checker drafts none. |
| SG-LAW-counted-reach-missing | 3 | Administration staffing, public-sector bargaining and ward lines reach no counted group. |
| SG-LAW-wiring-dated-tax-rows | 1 | Income tax: past paychecks' rows stay open after the old rate is put back. |
| SG-LAW-public-pay-floor-start | 1 | No place starts with a public pay floor. |
| SG-LAW-local-income-tax-authority-change | 1 | No bill can change the local income tax authority (registered by the taxes family). |

The 400-day runs turned up three things beyond the grades:

- **Corporate income tax:** it reached businesses once a tax year passed. In the 35-day window, it had reached no one.
- **A crash in the death taxes:** a state with no inheritance tax that sets one by rate alone, as a bill can, stopped the year at the next estate. Fixed in #5744.
- **A crash at private school re-enrollment:** on main, every played year stopped at the August re-enrollment, because it read a parameter another change had removed. Fixed in #5743.

## The family pull requests

| Family                                                         | Pull request | State       |
| -------------------------------------------------------------- | ------------ | ----------- |
| Audit, checker and shared applied record                       | #5547        | merged      |
| Prices and sales taxes                                         | #5629        | merged      |
| Justice                                                        | #5642        | merged      |
| Health, assistance and schools                                 | #5652        | merged      |
| Government and elections                                       | #5582        | open, ready |
| Labor and pay                                                  | #5589        | open, ready |
| Taxes and public finance                                       | #5649        | open, ready |
| Rights, technology, environment, farms and parks               | #5669        | open, ready |
| Housing and credit                                             | #5688        | open, ready |
| Group B work-requirement test (red on main after #5652)        | #5732        | open, ready |
| Death taxes adopted by rate only (found by the 400-day run)    | #5744        | open, ready |
| Private tuition re-enrollment (red on main: removed parameter) | #5743        | open, ready |

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

Laws that act on a later event (a lease anniversary, a hearing, a death, an election, a tax return), and the laws whose only reads were inside law reach, were run again for 400 days (`--days 400`). A read inside `src/core2/law-reach` is recorded with the frame that called it, and counts as an engine's read when that caller is an engine. For a law in force at the opening, only reach under the rows the checker repealed counts, because a body in play may enact the law again during a long window.
