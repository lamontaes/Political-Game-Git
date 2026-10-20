# Every law is wired or carries a registered stopgap; 2 of 89 pass all nine links outright

With all eight law families merged together, every one of the 89 laws is now graded green or covered by a registered stopgap on each of its nine links:

- 2 laws pass every link outright: legal cannabis sales and abortion restriction.
- The other 87 are wired except for links each tied to one of 12 specific stopgaps, listed below with their reasons.

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

| Link                                | Wired | Not applicable | Stopgap |
| ----------------------------------- | ----- | -------------- | ------- |
| 1. Exists in all 56 places          | 88    | 0              | 1       |
| 2. A body can enact and repeal it   | 88    | 0              | 1       |
| 3. Reaches people and organizations | 57    | 3              | 29      |
| 4. Read by the engine it changes    | 52    | 0              | 37      |
| 5. Moves money                      | 83    | 0              | 6       |
| 6. Moves its outcome-web measures   | 16    | 9              | 64      |
| 7. People learn of it by a read     | 80    | 0              | 9       |
| 8. Repeal stops it                  | 67    | 0              | 22      |
| 9. Same code path everywhere        | 63    | 0              | 26      |

No link is partial or missing. "Not applicable" is declared only where the law's own terms or its research rule a link out: for example, term limits reach only officeholders, who are always full people, and some research puts a law's effect on an outcome at about zero. Each declaration is in `scripts/law-wiring/declared.json` with its reason.

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

## What the stopgaps cover

Each stopgap is a row in `src/core2/data/stopgaps.json`, marked in `src/core2/data/laws/wiring-gaps.json` with the laws and links it covers. A stopgap is not wiring: each stays open until its replacement lands, and the release build refuses while any is open.

| Stopgap                                  | Laws | What it covers                                                                                                                                                                                                                                               |
| ---------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SG-LAW-wiring-checker-window             | 24   | The law's event or subject did not occur in the checker's 35-day window in a drawn town (a lease anniversary, a hearing, a death, a claim, a teacher under the floor, a town with no transit line); each family test shows the link in its own played world. |
| SG-LAW-wiring-read-in-law-reach          | 24   | The law is applied by its law-reach module on the engine's step; the checker's trace can't show an engine outside law-reach reading it.                                                                                                                      |
| SG-LAW-outcome-link-unresearched         | 45   | No researched outcome link starts from the law.                                                                                                                                                                                                              |
| SG-LAW-outcome-link-not-fired            | 10   | Built links did not move their measure within 35 days.                                                                                                                                                                                                       |
| SG-LAW-outcome-not-produced              | 9    | A researched link names an outcome the web doesn't produce.                                                                                                                                                                                                  |
| SG-LAW-wiring-budget-news                | 9    | The checker amends budget lines directly, which is not news; in play the bill is.                                                                                                                                                                            |
| SG-LAW-budget-line-reach-not-ended       | 5    | Rows recorded under a raised budget line stay open until staffing next acts, because `endReplaced` skips budget-line keys.                                                                                                                                   |
| SG-LAW-wiring-read-on-drafting           | 4    | Authority laws are read only when a body drafts a bill under them, and the checker drafts none.                                                                                                                                                              |
| SG-LAW-counted-reach-missing             | 3    | Administration staffing, public-sector bargaining and ward lines reach no counted group.                                                                                                                                                                     |
| SG-LAW-wiring-dated-tax-rows             | 1    | Income tax: past paychecks' rows stay open after the old rate is put back.                                                                                                                                                                                   |
| SG-LAW-public-pay-floor-start            | 1    | No place starts with a public pay floor.                                                                                                                                                                                                                     |
| SG-LAW-local-income-tax-authority-change | 1    | No bill can change the local income tax authority (registered by the taxes family).                                                                                                                                                                          |

The measured causes behind them:

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
