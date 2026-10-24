# Two neighbors with opposite temperaments now keep different reasons for the same choices, but their days still look alike

Nothing from the traits families has reached main yet; eight pull requests hold the work. In two towns drawn on main, 58 and 66 of the 86 personality decisions ran in a played year. 21 weights come from research, and 13 of 23 outcomes are read, with 6 more in part. In a played year, two neighbors in the same situation with opposite temperaments kept different reasons for the same six choices. They ended the year with different friendships, work, savings and civic lives. Across a town, though, opposite neighbors' days sit only a little further apart than with personality wiped flat, short of the doubling asked for. The cause is filed, and one question waits on the owner.

## Status at 11:00 UTC, October 24

| PR    | Branch                                | Pool item                            | What it holds                                                                                                                                 | State                                                            |
| ----- | ------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| #5587 | claude/traits-money                   | traits-wire-money                    | Borrowing, quitting, accepting, founding and moving at studied sizes, for named and counted people alike                                      | Green on every check                                             |
| #5657 | claude/traits-civic                   | traits-wire-civic                    | Turnout, news telling, meetings, parties, interest groups, press and claims as one calibrated term each; persuasion and trust read the hearer | Main merged in; carries the open small-town campaign fix         |
| #5715 | claude/traits-integrity               | traits-wire-integrity                | Justice, tips, recalls, constituent cases and staff read their decision weights; taking a bribe is calibrated                                 | Carries the open corruption-spec fix                             |
| #5882 | claude/traits-campaigns-own-sd        | traits-campaigns-own-sd              | Campaign weights rescaled by each trait's own spread                                                                                          | The speed guard refuses data the opening reads                   |
| #5885 | claude/serene-mccarthy-ae8xo9         | traits-end-to-end-pair               | The year-long pair test and the weighed-choice records it names                                                                               | Green on every check                                             |
| #5886 | claude/traits-decisions-never-run     | traits-decisions-never-run           | The audit plays a place's own election year; every silent decision names its cause                                                            | Carries the open small-town campaign fix                         |
| #5889 | claude/play-bench-follow-decisions    | play-bench-follow-and-read-decisions | The bench shows why a followed person chose                                                                                                   | Green on every check                                             |
| #5901 | claude/traits-outcome-job-performance | traits-outcome-job-performance       | Employers value how a person works when hiring and laying off                                                                                 | Stacked on #5587; the speed guard refuses data the opening reads |

Two failures on main turned family PRs red: the small-town campaign spec and the corruption spec. Each has an open fix, and those fixes are ported unchanged into the PRs they affected. A ported fix changes nothing once main carries it.

## Main now, in two drawn towns

New Preston, Connecticut (place key 0952770, seed `bbef955cbe3c`) and Ilwaco, Washington (5333000, seed `92ca8748de59`). Both were drawn at random from all 56 places, built as the game builds a world with every module, and played January 20, 2025 to January 20, 2026. Each played year ran beside a flat twin, with every trait zero, and a mirror twin, with every trait flipped. Main was at `408abfecc5`.

| Measure                                                    | New Preston               | Ilwaco                    |
| ---------------------------------------------------------- | ------------------------- | ------------------------- |
| Personality decisions that ran (of 86)                     | 58                        | 66                        |
| Weights from research                                      | 21                        | 21                        |
| Outcomes read by their owning engine (of 23)               | 13, and 6 in part         | 13, and 6 in part         |
| Opposite neighbors' daily mix apart, personality on / flat | 0.802 / 0.791 (316 pairs) | 0.761 / 0.743 (345 pairs) |
| A played year, one process                                 | 76 s                      | 79 s                      |

All measured with `scripts/traits/trait-wiring-audit.ts` and `scripts/traits/trait-wiring-matrix.ts`. The matrix now has 86 decisions, two more than on October 20.

## On the family branches

Each family was played in two towns of its own, drawn fresh. The numbers are from each PR's own run.

| Branch    | Town (key, seed)                                   | Ran      | Weights from research | Neighbors on / flat |
| --------- | -------------------------------------------------- | -------- | --------------------- | ------------------- |
| Money     | Holualoa, Hawaii (1515700, `6f7794a4906f`)         | 56 of 86 | 31                    | 0.421 / 0.423       |
| Money     | Peacham, Vermont (5054325, `58e683537f9b`)         | 63 of 86 | 31                    | 0.269 / 0.229       |
| Civic     | Ora, Indiana (1856700, `66c0262471b0`)             | 59 of 88 | 25                    | 0.823 / 0.788       |
| Civic     | Arbela, Missouri (2901576, `45226c03833c`)         | 49 of 88 | 25                    | 0.093 / 0.190       |
| Integrity | Jerry City, Ohio (3939074, `3c281162294d`)         | 61 of 86 | 21                    | 0.280 / 0.266       |
| Integrity | New Britain, Connecticut (0950370, `95d438217dbb`) | 63 of 86 | 21                    | 0.314 / 0.285       |

Civic adds two decisions (believing a claim, and an employer joining a group) and brings persuasion, trust and news reaction to read the hearer's traits, which makes 16 of 23 outcomes read. The job-performance branch adds `jobs.value-worker` and grades job performance read, so 14 of 23 are read there.

## The pair

Arlington, Massachusetts (place key 2501640), seed `5a7c3c7d9b401cdcd72ed400575db591bb1a2d07:trait-end-to-end:0`, January 20, 2025 to January 20, 2026. The test picks two working adults by rule: the same age band, household size and savings band, with the traits furthest apart. Here they are `person_004b49fa202a5d94` and `person_010ebd0456832688`, both born in 1986. Both are put in focus, as the people a player deals with are.

Their trait reasons pulled opposite ways in six decisions, each named by a record of each person:

- Staying out of a race: `weighed:2025-01-21:candidacy-stay-out:person_004b49fa202a5d94` against `weighed:2025-01-21:candidacy-stay-out:person_010ebd0456832688`.
- Keeping a business idea on the shelf: `weighed:2025-02-01:business-owner-keep:person_004b49fa202a5d94` against `weighed:2025-02-01:business-owner-keep:person_010ebd0456832688`.
- Resting over seeing someone: `act:2025-01-25:person_004b49fa202a5d94:10` against `act:2025-01-27:person_010ebd0456832688:12`.
- Going to a party meeting: `weighed:2025-10-29:parties.attend:person_004b49fa202a5d94` against `weighed:2025-10-29:parties.attend:person_010ebd0456832688`.
- Going to a scheduled shift: `act:2025-01-21:person_004b49fa202a5d94:1` against `act:2025-01-23:person_010ebd0456832688:3`.
- Giving to a campaign: `weighed:2025-08-03:campaigns.donate:person_004b49fa202a5d94` against `weighed:2025-10-11:campaigns.donate:person_010ebd0456832688`.

Their years came out different in five of six measures. The first went to see people 104 times against 28 and missed no shift against 11. The first saved $5,099 and the second $2,770. The second joined a party and gave to a campaign once; the first did neither. With both people's traits wiped flat after they are picked, no decision differed in any of three drawn places, and the test fails.

## Why opposite neighbors' days barely differ

The order asks the opposite-neighbors gap to reach twice its October 20 value of 0.10. On main it is 0.011 and 0.019. On the family branches it runs from -0.097 to +0.040. Personality does reshape a person's own year: flipping one person's traits moves their mix of daily choices 0.20 to 0.41 apart. The gap stays small for three measured reasons:

- **Routine fills the day.** Going to scheduled work is about 35% of picks, and temperament turns 0.7% of them. Shelving a business idea each month is about 25%, and temperament turns none, because market room decides it.
- **Neighbors picked for opposite traits already differ.** They differ by job, age and household, so the distance saturates: Ora's opposite neighbors sit 0.79 apart with traits flat and 0.82 with them.
- **Temperament sometimes cancels what circumstances made.** In Peacham, retelling news, officials attending a sitting and taking up a cause widen the gap. Seeing someone and going to work narrow it.

The check is not loosened. The cause is filed as `traits-neighbors-gap-routine`, which measures again on main after the families merge. A new daily activity that would let temperament show is the owner's call, not a fix.

## Outcomes still not read

After the families merge, seven of 23 outcomes remain:

- Earnings: pay does not grow with how a person works. This is the owner's question below.
- Coping after a layoff or eviction: `traits-outcome-hardship-coping`. It waits on the money and civic families, which change the same files.
- How others learn a person's temperament: `people-impressions-from-witnessed-acts`.
- How a person talks: `words-speech-reads-speaker-traits`, owned by the Words line.
- Forming and ending partnerships: no engine runs them in play (`SG-TRAITS-partnerships-no-engine`). `people-partnership-forms` and `people-partnership-ends` bring the engines.

## Decisions that still never run

Played around a place's own election, 66 of 86 decisions ran. Each of the 20 silent ones has a gap row naming the file and line that keeps it silent and the pool item that will start it. The largest group waits on one choice: nobody takes a bribe in most towns, so telling, tipping, reporting, prosecuting, pleading and clemency never start.

## Owner decision

**Should a worker's pay grow with tenure and how they work?** Today a worker is paid the rate their job was posted at, so temperament changes earnings only through who is hired first and who is let go last. Real pay grows with tenure and performance: Gensowski 2018 finds about 16.7 percent of lifetime earnings per standard deviation of conscientiousness. It is registered as `SG-TRAITS-pay-growth-by-performance` and written under Open in `OWNER-DECISIONS.md`.

## What happens next

After each family merges, the twins run again on main with the same two seeds, and this report's tables are replaced. Then come the coping outcome and the neighbors gap, measured on main with every family in.
