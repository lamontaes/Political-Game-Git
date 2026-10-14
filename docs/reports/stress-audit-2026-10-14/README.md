# A planning director votes against his own cause, and the town office never answers him

The owner has two calls to make, listed under "Questions for the owner": may one person hold a board seat and a department post at once, and should family ties count against a hire. In Hurlock, Maryland, 25 defects were confirmed. Three break play. A board member's votes never read his own views, so speeches change no vote. A town office never answers a resident who comes to it. Full people never retire or stop working. Separately, 17 of the 29 officials' aides are out-of-town relatives the game never filled in, the oldest 92. All 25 defects are open, each with its lane.

## The run

Hurlock, Maryland, a town drawn at random from all 56 states and territories. The world ran 266 days, from January 20 to October 13, 2025. One full person and one business closing were followed down every path the records allow.

## Words used here

- **Full person:** someone the game simulates one by one, with a past, traits and daily choices: the player, their household and circle, officials, people the player meets.
- **Counted person:** part of the town's modeled population, kept as numbers by place, age and job until the player meets them.
- **Husk:** a relative living outside the town, kept as a name and family ties only. The game has not generated their schooling or work, and they are meant to sit idle.
- **Lean:** where a person stands from left to right, set when the world opens.
- **Cause:** an issue a person has taken up and acts on, such as rent stabilization.
- **Tracer:** one of the nine read-only agents, each following one path through the records and code.

## Derek Ramirez's year, 2025

Derek Ramirez is 54 and lives in Hurlock with his wife Anika and their daughters Sofia and Eva. He owns his home and pays $437.82 a month on a mortgage he took out in 2016. He was already an elected member of the town board, serving until December 7, 2026. On opening day, January 20, 2025, the mayor appointed him Planning Director at $46 an hour and appointed Anika Finance Director. Sofia, the player, works on the state attorney general's staff. At the February 4 board meeting Derek voted no on four ordinances, rent stabilization among them; it failed 1 to 6. That same day he heard speeches for rent stabilization and took up the cause. Within four days he organized a meeting, went to the town office about it, and founded a group to pass it. On March 25 he founded a second group, on inclusionary housing rules. He gave $49.02 on each of 168 days, cared for Eva 42 times, worked 134 shifts and skipped 56. On February 24 the candidacy engine decided he will run for state House district 37A in 2026; nothing is filed yet. On August 18 he voted no on rent stabilization again, and it failed 1 to 6 again.

### His money

His money balances to the cent (measured). He opened with $931.38 and was paid $46,736.00 before taxes. Out went $12,260.50 in taxes, $280.41 in a state leave premium, $3,940.38 in mortgage payments, $17,489.02 in living spending and $8,235.36 in gifts to causes. He ended with $5,461.71. His account reached exactly $0 twice, after living spending on February 1 and April 1.

## The school that closed, 2025

Zamora Academy was a small private school run by one owner, a 66-year-old counted resident. It lost money from its first month. Its cash fell from $3,214.61 on February 1 to $1,426.79 on March 1 and to $0 on April 1. On January 21 the town bank had approved it a credit line of $2,114.11. The school never drew a dollar of it. On June 1 the owner closed it, a choice scored from the school's losses and the owner's age. He took nothing out, filed for unemployment at $390.81 a week, and was hired the next day as a project manager at $50.98 an hour. The claim ended with that hire, before any payment. He retired on July 1. After the closure the bank kept the line open and repriced it on September 25. Defects 7 to 11 below say what went wrong on this path.

## Confirmed defects

Every row was confirmed by opening the code. In the evidence column, "measured" means the record was also seen in this world; "inferred" means it follows from the code but did not show in this run.

**An effect is a read, not a record (6)**

| #   | Defect                                                                                                                                                                | Where                                               | Evidence | Record                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | A resident who goes to a town office about a cause never hears back, and can never go back about that cause: the office's reply is filed and never delivered.         | `life.ts` approach gate, `state.ts` requestCallback | measured | `callback:person_0314b1dc16a1f114:organization_022ecfc19c643dd6:cause:us-policy-positions:housing-land-use.rent-stabilization` |
| 2   | Cause-group accounts take donations and never spend them. Derek's rent group took $20,562.73 in 401 gifts and spent $0.                                               | `drives.ts` payDonation                             | measured | `organization:cause-group:person_0314b1dc16a1f114:cause:us-policy-positions:housing-land-use.rent-stabilization`               |
| 3   | Board votes read the member's opening lean, never his stances, and nothing moves a lean after the opening. He heard 38 speeches, and none changed any of his 8 votes. | `legislature.ts` positionOn, `views.ts` viewOf      | measured | `vote:bill:office:gus2025:208241:board:2025-08-18:person_0817ab62f9e5f189:13:person_0314b1dc16a1f114`                          |
| 4   | Outcome-web landing rows are written for each person and never read; the only reader function has no caller. The world holds 6,988 such rows.                         | `outcome-web.ts` land, outcomesOn                   | measured | 81 landings rows naming `person_0314b1dc16a1f114`                                                                              |
| 5   | The business closing choice stores how it was decided and its reason values, and nothing reads them.                                                                  | `business.ts` closeByChoice                         | measured | `choice:organization_f1b649f50d4ecc93:2025-06-01`                                                                              |
| 6   | The unemployment law in the starting law table is never read; the function that would register it has no caller, so every claim uses stand-in terms.                  | `jobs-benefits.ts` registerUnemploymentTerms        | measured | `claim:person_74d229ea576b525a:2025-06-01`                                                                                     |

**Every dollar balancing and wire to the world (8)**

| #   | Defect                                                                                                                                                                               | Where                                                      | Evidence | Record                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| 7   | When wages for counted workers run short, the employer pays only its cash and never draws its approved credit line; this shortcut has no stopgap row.                                | `residents.ts` wage flow payment                           | measured | `facility:organization:bank:jurisdiction_17f1e3279a566174:organization_f1b649f50d4ecc93`                      |
| 8   | A closed business's credit line stays active and keeps being repriced and billed: wind-down skips the interest contract, and repricing never checks for closure.                     | `finance-state.ts` windDownEmployer, `macro.ts` repricing  | measured | `facility:organization:bank:jurisdiction_17f1e3279a566174:organization_f1b649f50d4ecc93:2025-09-25`           |
| 9   | A closure lists no ended jobs and zero workers affected when the jobs were counted jobs, though the owner's job ended that day.                                                      | `finance-state.ts` windDownEmployer, `business.ts` onEvent | measured | `closure:organization_f1b649f50d4ecc93`                                                                       |
| 10  | Every business closure's news record says it "could not pay what it owed," even when the owner closed it by choice.                                                                  | `business.ts` onEvent                                      | measured | `event:business.closed:organization_f1b649f50d4ecc93`                                                         |
| 11  | A school voucher eligibility row is never ended when the school closes.                                                                                                              | `group-b-store.ts` organization rows                       | measured | `us-policy-positions:education.public-funds-for-private-schooling\|organization_f1b649f50d4ecc93\|2025-01-20` |
| 12  | Public pay to anyone living outside the town has no tax withheld, so the out-of-town aides are paid untaxed.                                                                         | `budgets.ts` withhold                                      | measured | `job:public:staff:person_0314b1dc16a1f114:person_44bb924c56cdd487`                                            |
| 13  | Withholding records are tagged sourced, although the law rows they cite are carried-back estimates.                                                                                  | `budgets.ts` withhold                                      | measured | `withholding:work-payroll:2025-02-05:work-commitment:job:public:town:planning:person_0314b1dc16a1f114:1`      |
| 14  | The county income tax is taken from gross pay, though the law row taxes income after deductions, and the shortcut has no stopgap row. Derek's county line was $109.30 on February 5. | `tax-withholding.ts` withholdingFor                        | measured | the same withholding record as row 13                                                                         |

**Two-level population and people (7)**

| #   | Defect                                                                                                                                                                                                                                                                                      | Where                                                     | Evidence | Record                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| 15  | Full people never retire or stop working. In 266 days, 60 counted workers did; of the 58 full people with jobs, none did, though 7 quit for other jobs. The leave branch is attached to the wrong condition.                                                                                | `jobs.ts` job review, line 725                            | measured | no record, which is the defect: no full-person left-work row exists                         |
| 16  | Officials hire relatives regardless of where they live or their age. Husks have no generated work, so they always count as out of work and win. Of 29 aides, 17 are relatives of the official who hired them, all out-of-town husks; 5 of the 17 were born before 1955, the oldest in 1932. | `staff.ts` staffCandidates, staffReview                   | measured | `staffer:person_0314b1dc16a1f114:person_44bb924c56cdd487`                                   |
| 17  | Husks in the player's circle make choices every day, though husks are meant to sit idle. One living elsewhere volunteered in Hurlock on 224 of 266 days, because group membership never reads distance.                                                                                     | `calendar.ts` hasDailyFocus, `drives.ts` volunteer offers | measured | `act:2025-02-26:person_fc985c12436f71d3:73`                                                 |
| 18  | Joining an interest group never leaves the opposing one. Both right-to-work groups have 22 members, and 15 people, Derek among them, belong to both.                                                                                                                                        | `interest-groups.ts` group forming                        | measured | `group:jurisdiction_17f1e3279a566174:us-policy-positions:labor-workforce.right-to-work:for` |
| 19  | Candidacy counts a person's strongest drive of any kind as a cause, so a grudge or family drive pushes someone to run.                                                                                                                                                                      | `candidacy.ts` reasons                                    | inferred | `contest:seat:US-MD:lower:37A:0:2026-11-03:person_0314b1dc16a1f114`                         |
| 20  | Health cases are assigned once at the opening, so anyone filled in later never gets a health record.                                                                                                                                                                                        | `health.ts` initialize                                    | inferred | no record; no late fill-in happened in this run                                             |
| 21  | How close two people are fades over time, but the drives engine's attention reads the unfaded value, as do voting, candidacy, corruption and legislature. On a 0-to-1 scale, Anika's tie to an older relative reads 0.0209 instead of 0.0151.                                               | `drives.ts` closenessTo                                   | measured | `person_0314b2dc16a1f2c7:person_ab2df396fb887448`                                           |

**One rule, all places (1)**

| #   | Defect                                                                                            | Where                       | Evidence | Record                                            |
| --- | ------------------------------------------------------------------------------------------------- | --------------------------- | -------- | ------------------------------------------------- |
| 22  | The credit engine names four territories by postal code and county code in logic instead of data. | `credit.ts` territory table | inferred | no record; the path runs only in a territory town |

**Shortcuts with no stopgap or parameter row (3)**

| #   | Defect                                                                                                                                                                      | Where                                      | Evidence | Record                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------- | ------------------------------------------------- |
| 23  | Each adult's opening thought about moving is a seeded draw with no stopgap row, and it makes up nearly all of the monthly pull: 0.4769 of Derek's 0.479, on a 0-to-1 scale. | `moves.ts` pullOf                          | measured | the moves pulls row `person_0314b1dc16a1f114`     |
| 24  | Appointment qualification uses fixed constants and an age-25 cutoff with no parameter or stopgap row.                                                                       | `executive.ts` qualification, fillTownPost | measured | `appointment:town:planning`                       |
| 25  | A business owner's age, when weighing a closing, can be off by a year: it subtracts birth year from the current year.                                                       | `business.ts` reviewClosures               | inferred | `choice:organization_f1b649f50d4ecc93:2025-06-01` |

## What happens next

All 25 are open; none is fixed. The CTO routes them on the board. By owner of the engine:

- **OPUS-CORE:** 1, 4, 7, 9 and 17 (the calendar half), plus 8 (the wind-down half).
- **OPUS-GOV:** 3 (the vote half), 11, 12, 13, 14, 16, 18, 19 and 24.
- **OPUS-PEOPLE:** 2, 3 (the views half), 17 (the volunteering half), 20, 21 and 23.
- **OPUS-WORLD:** 5, 6, 8 (the repricing half), 10, 15, 22 and 25.
- **FIXER candidates, one per pull request:** 15, 10, 13, 22 and 25, each small and local.

## Questions for the owner

- Derek holds an elected board seat and an appointed department post at once, and appointments never check for a sitting member. Real towns usually forbid this. Should the game?
- The mayor appointed a husband and wife to two department posts on the same day, and every relative hire in defect 16 was an official hiring family. Should family ties weigh against an appointment or a hire, or is that a story the game should let happen?

## Paths that came back clean

- **Derek's pay reaching his account (measured).** Each payday moved money from the town treasury to him, and his account balances from $931.38 to $5,461.71. The tax rates came from the law table; the county base is defect 14.
- **His home (measured).** He owns it, and the $437.82 payment comes from census home values, the mortgage rate of June 2016, when he bought, and a 30-year term, each a sourced row.
- **His choices (inferred from the code).** Every act was picked by the highest score from his needs, drives, traits, mood and time, with a fixed tie-break and no seeded draw.
- **How his closeness to people changes (inferred from the code).** Each change follows hours spent together and fades smoothly, from sourced time-use hours, with no roll. Defect 21 is about which value other engines read.
- **His causes (measured).** Both drives formed from speeches he witnessed and grew with each act; the chooser and the candidacy engine read them.
- **The closing decision itself (measured).** It came from the school's losses and the owner's age through tunable rows, not a roll.

No seeded roll or fixed percentage decided a choice on these paths. Two opening values are seeded draws describing people at the start: political lean, which is allowed generation, and the moving pull, which lacks its stopgap row (defect 23).

## What could not be reached

- The school's 43 bank entries, and where its students went: the school-days engine reads only public schools.
- Why living spending drains Derek's account to exactly $0 on some months.
- Derek's July 1 board vote has a total of 0.3693, and its parts add to 0.0828 (record `vote:bill:office:gus2025:208241:board:2025-07-01:person_e5279cc7c641f07b:8:person_0314b1dc16a1f114`). Why was not reached.
- Which screens show the closure.

Four findings were not reproduced in the code and are not counted. The one that matters: Derek does not hold the finance director post; Anika does.

## Noticed, not judged

- The right-to-work groups for and against have 22 members each, and 15 people are in both.
- The school's owner was hired on June 2 and retired on July 1, 29 days later.
- Derek gave $8,235.36 to causes, 18% of his $46,736.00 pay, and his account still reached $0 twice after living spending.

## Method

- Head `fd3574c979716bcb4fefa42461295e2fe5b5e2d5`; place Hurlock, Maryland, GEOID 2441125, drawn from all 56; seed `15513797739fafb69515f110d1a91244bfcacee498ead5413849335757399ef1`, place seed `b82b57e62e8f43c4dbd95a1c29dad3a145df2877ba4a868ea9df870a2a2165fe`. Seed and span were drawn from the clock.
- The played world was built as the bench builds it, two-level, every module installed, bookkeeping off. It ran 266 days, January 20 to October 13, 2025, in 116 seconds.
- Nine Haiku agents ran at once, read-only, one path each: job, paychecks, home, relationships, choices, health and drives, views, the closure's cause, and the closure's readers and money. A Sonnet agent reviewed this report.
