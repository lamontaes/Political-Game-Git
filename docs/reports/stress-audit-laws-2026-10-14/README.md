# The county board passes a law and repeals it two weeks later, all year

Two calls are yours. First, may a body repeal a law it passed two weeks earlier? Today nothing stops it, and the county did so all year. Second, The Political Process baseline lists no taxes or benefits, so it does not say whether paycheck taxes and unemployment benefits belong in the game.

In a 400-day world in Lydia, South Carolina, the county board passed and repealed the same three policies every 15 days. No state legislature meets anywhere in 2025. Congress cut every federal spending line by a quarter, and national output kept its pace. Treasuries collect money and almost never spend it. Nobody in town brings a law up. There are 25 confirmed defects.

## The bill's life

In the sections that follow, every number and date is measured in the run's records. A statement about what the code does is marked "read in the code".

On February 4, 2025, board member Aiko Rodriquez filed ordinance 2025-001, joining Darlington County to federal immigration enforcement. The board has seven members, under the size that needs committees, so the bill went straight to a vote. It passed 5 to 2. The county has no elected executive, so nobody signed it, and it took effect 30 days later, on March 6.

Fifteen days after passage, member Richard Simpson filed 2025-018 to repeal it. The repeal passed 4 to 3 on February 19 and took effect March 21. Aiko Rodriquez voted yes on the repeal of Rodriquez's own ordinance.

Each vote is a sum of parts the game records. For Rodriquez on the repeal, the parts were: views −0.114, district −0.017, tie to the sponsor +0.001, and personality +0.248, for a total of +0.118, a yes. The personality part measures a taste for change over keeping things the same, and it is the same number whichever way a bill points. A repeal is a change too, so it outweighed Rodriquez's views. The parts are measured in the run; that the personality part ignores the bill's direction is read in the code (`src/core2/modules/legislature.ts:1133`).

Over 26 meetings the board filed 200 policy bills, from 3 to 15 a meeting: 96 passed, 19 failed on the floor, and 85 ran out of agenda time. The cycle repeated every meeting for the immigration partnership, a Medicaid work requirement and universal preschool. Over 400 days the board voted 26 times on the immigration question alone, alternating sponsors, and every one of those bills passed.

## The day-one laws

Paycheck taxes are the only day-one laws that reached a household's money. Megan Mullen, in the player's household, was paid $634.40 on September 25, 2025 (`work-payroll:2025-09-25:…:person_ed8f77123a57b31b:18`). The paycheck withheld $1.69 of federal income tax, $5.24 of state income tax, $39.33 of Social Security and $9.20 of Medicare. Those amounts follow the withholding tables for a low monthly wage (read in the code, `src/core2/modules/budgets.ts:924`). The net $578.94 reached Megan Mullen's account in full, and the federal line checks by hand. Employers paid no Social Security or Medicare of their own (defect 19).

South Carolina's $350 weekly unemployment maximum is never read. A worker laid off when their employer closed drew $479.47 a week (`claim:person_1592eab735097b75:2025-05-01`). The benefit uses a national stand-in, a registered stopgap (read in the code, `src/core2/jobs-benefits.ts:56`). SNAP's maximum appears on the bench's law list, and no other code reads it (read in the code, `src/core2/modules/laws.ts:421`).

The $7.25 minimum wage never bound. Hiring sets pay from the median of peers in the same role and does not read the floor (read in the code, `src/core2/modules/jobs.ts:553`).

Nine laws scheduled for January 1, 2026 took effect, including federal and state income tax, state sales tax and unemployment. Each carried the same value as the row already in force, so no number moved.

## The state law's effects

The South Carolina legislature passed no policy law in 400 days. The session data holds only 2026 sessions, and South Carolina's ends May 7, 2026, after the run. The state's one legislative act was its budget, which runs on its own fiscal-year path. It was adopted July 1, 2025 by votes of 89 to 35 and 34 to 11. It followed the governor's cuts: Medicaid and welfare fell $414 million from $11.5 billion. That cut is 5% of the line times the governor's lean (read in the code, `src/core2/modules/legislature.ts:427`).

At the macro level, the national, regional, jobs, housing and business engines never ask what law is in force (read in the code: none of their five files makes that call, for example `src/core2/modules/macro.ts`). So no unemployment, price or wage number moved because of state law. At the micro level, state income tax reached Megan Mullen's paycheck as shown above. The state's 6% sales tax and 1.49% local average enter prices (read in the code, `src/core2/modules/budgets.ts:523`). The state treasury took in $55.3 billion over the run, nearly all of it 13 monthly receipts of outside revenue, and paid out $444,000. That one account is most of the journal's $56.6 billion.

## The federal law's effects

On December 15, 2025, Congress filed, heard in committee, passed through both chambers and signed 12 policy bills, all on one day. One was a "balanced operating budget." It cut every federal spending line by 25.3%, $1.77 trillion in total. Social Security fell from $1.58 trillion to $1.18 trillion, and interest on the debt fell from $970 billion to $725 billion.

At the macro level, national output grew at the same pace through January and February 2026. Unemployment rose 0.03 points a month, as it had all year. Registered stopgap SG-WORLD-macro-public-budget says public budgets add no push to the economy, so this is expected for now (read in the code, `src/core2/data/macro/parameters.json:309`). At the micro level, no one's benefit or paycheck changed.

Congress also passed "adopt an income tax." It wrote nothing, because a federal income tax already exists, yet it recorded 1,426 people as reached. It passed "exempt groceries from sales tax," and the game applied that federal act to South Carolina's state and local sales tax.

## The budget

Darlington County's 2025 budget passed 7 to 0 on July 1, 2025, as bill 2025-068, and the bill had no lines. A county budget bill gets its lines from the county executive, and Darlington has none, so the board adopted last year's budget unchanged (read in the code, `src/core2/modules/legislature.ts:439`; the unchanged budget is measured). The budget is built once at the opening from Census spending per resident and does not change with prices, population or the county's laws (read in the code, `src/core2/modules/budgets.ts:221`).

The journal balances: across 24,524 entries, debits and credits are both $56.6 billion. The county treasury took in $176.0 million in the 13 months it collected and paid out $395,000. The adopted spending, about $154 million for the period, never left the treasury. Of the $176.0 million, $170.1 million is outside revenue on a fixed monthly schedule, and at most $4.6 million is property tax. The last $1.3 million has no posting in the records kept.

## Confirmed defects

Each row was opened in the file named. "Run" means the defect showed in the run's records; "code" means it was read in the code and the run did not exercise it.

| #   | Rule broken                      | Seen | Where                                                                                               | Record                                                                                                | What happens                                                                                                                                                 |
| --- | -------------------------------- | ---- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Actors decide from their reasons | run  | `src/core2/modules/legislature.ts:1133`, `positionOn`                                               | `vote:bill:office:gus2025:134411:board:2025-02-19:person_0692d7c8305dc27d:16:person_df7360cd247fc890` | The personality part of a vote ignores which way the bill points, outweighs the member's views, and makes members vote for a law and its repeal.             |
| 2   | Actors decide from their reasons | run  | `src/core2/modules/world-legislating.ts:331`, `filingReason`                                        | bill 2025-018                                                                                         | The same direction-blind part adds to filing, so members file both a change and its reversal.                                                                |
| 3   | Sliding scales and causes        | run  | `src/core2/modules/world-legislating.ts:629`, `recentlyDefeated`                                    | 26 county bills on the immigration question                                                           | Only a defeated bill must wait, so a law passed two weeks ago can be repealed at the next meeting.                                                           |
| 4   | Actors decide from their reasons | run  | `src/core2/modules/legislature.ts:1745`, sign-or-veto                                               | 12 federal bills signed December 15, 2025                                                             | The executive's personality adds the same push toward signing on every bill.                                                                                 |
| 5   | One rule, all 56 places          | run  | `src/core2/modules/world-legislating.ts:90`, `openWorldLegislating`                                 | sessions table                                                                                        | The session data lists only 2026 sessions, so no state legislature meets in 2025.                                                                            |
| 6   | One rule, all 56 places          | code | `data/research/laws/state-session-calendars-2026.json`                                              | Montana, Nevada, North Dakota, Texas                                                                  | These four states meet in odd years and have no rows, so they never legislate.                                                                               |
| 7   | One rule, all 56 places          | code | `src/core2/modules/legislature.ts:834`; `src/core2/offices-state.ts:121`, `:397`                    | delegate seats                                                                                        | Washington, D.C. and the territories are named in logic instead of read from the office's kind.                                                              |
| 8   | One rule, all 56 places          | code | `src/core2/state-effective-date.ts:49`, `stateActEffectiveDate`                                     | Alabama                                                                                               | Alabama's rule kind is unsupported, so its acts silently take the 30-day ordinance delay; no stopgap.                                                        |
| 9   | An effect is a read              | run  | `src/core2/law-reach/group-b-money.ts:411`, `balancePlan`                                           | `balance\|US\|2025-12-15`                                                                             | The cut spares a line named `interest`, but the federal line is `netInterest`, so interest on the debt is cut 25.3%.                                         |
| 10  | An effect is a read              | run  | `src/core2/law-reach/group-b-money.ts:404`, `balancePlan`                                           | `budget:US:2025`                                                                                      | A balanced-budget law cuts Social Security and every other line by one ratio on one day, and nothing pays anyone less.                                       |
| 11  | An effect is a read              | run  | `src/core2/modules/budgets.ts:195`, `government`                                                    | `organization:treasury:county:45031`                                                                  | Adopted spending is never paid from a treasury: $176.0 million in, $395,000 out; no stopgap.                                                                 |
| 12  | An effect is a read              | run  | `src/core2/modules/legislature.ts:439`; `src/core2/modules/budgets.ts:864`                          | `budget:county:45031:2025`                                                                            | With no county executive the budget bill has no lines, last year's budget is adopted, and the notice cites the "adopted by rule" stopgap for a voted budget. |
| 13  | An effect is a read              | run  | `src/core2/modules/outcome-web.ts:629`, `outcomesOn`                                                | `landing:work-requirement-to-coverage:person_b380e76578a5c9ab`                                        | 5,418 outcome landings in 14 monthly readings, 452 of them nonzero, are written and nothing reads them.                                                      |
| 14  | An effect is a read              | run  | `src/core2/law-reach/group-a-records.ts:440`, `reachOn`; `src/core2/law-reach/group-b-store.ts:233` | reach rows for ordinance 2025-001                                                                     | The ordinance's duty on a county department and every law fact a person learns are read by nothing.                                                          |
| 15  | An effect is a read              | run  | `src/core2/law-reach/group-b-people.ts:213`, `selectResidents`                                      | 17 Medicaid work-requirement rows                                                                     | The work requirement reaches adults by the Medicaid expansion income line without reading whether the state expanded; South Carolina has not.                |
| 16  | An effect is a read              | run  | `src/core2/law-reach/group-b.ts:322`                                                                | federal act 2025-010                                                                                  | "Adopt an income tax" writes no tax, because one exists, yet records 1,426 people as reached.                                                                |
| 17  | One rule, all 56 places          | run  | `src/core2/modules/budgets.ts:673`, `groceryExemptionInForce`                                       | federal act 2025-012                                                                                  | A federal act removes state and local sales tax on groceries, which federal law cannot do.                                                                   |
| 18  | An effect is a read              | run  | `src/core2/modules/executive.ts:488`, `deskOf`; `src/core2/modules/laws.ts:509`                     | executive desk rows; `raises` table                                                                   | The executive's desk and the minimum-wage raise records are read only by tests.                                                                              |
| 19  | An effect is a read              | run  | `src/core2/modules/budgets.ts:924`, `withhold`                                                      | `withholding:work-payroll:2025-09-25:…:18`                                                            | Employers pay no Social Security or Medicare share, so business costs miss 7.65% of payroll; no stopgap.                                                     |
| 20  | Wire to the world                | code | `src/core2/modules/legislature.ts:1909`, `executiveDecision`                                        | none                                                                                                  | Nothing calls it, so a player who is mayor or governor could not sign or veto (inferred from no caller).                                                     |
| 21  | Depth through the director       | run  | `src/director/data/bring-it-up.json`; `src/core2/modules/views.ts:263`                              | 304 stances, none from a law                                                                          | People bring up only a closed organization, and views skip law events because they carry no topic.                                                           |
| 22  | Depth through the director       | run  | `src/director/data/journal.json:399`                                                                | 110 of 111 law notices                                                                                | The life journal has a line only for a new minimum wage.                                                                                                     |
| 23  | Depth through the director       | run  | `src/core2/modules/laws.ts:430`, `lawTookEffect`                                                    | 36 of 71 county law notices                                                                           | A repeal is announced as a law that "took effect", with no word that it ended something.                                                                     |
| 24  | Estimate, never unknown          | run  | `src/core2/modules/laws.ts:377`, `enactLaw`; `src/bench/changes.ts:44`                              | `law:county:45031:county:…partner-with-federal-immigration-enforcement:general:2025-03-06:2025-001`   | Ordinance rows are marked sourced though their date is a tunable delay, and the "what changed" screen shows 0 people reached for all three county laws.      |
| 25  | No hand-written player text      | run  | `src/core2/modules/legislature.ts:697`, authority check                                             | bill 2025-002                                                                                         | A fixed English reason says "the city attorney expects a challenge" for a county, and a county may pass a Medicaid work requirement with only that warning.  |

## Laws that change nothing anywhere

These laws took effect or ended in the run and no engine reads them at the moment it pays or decides. Some are registered stopgaps, which the rules allow. There are 10.

1. County immigration partnership (registered stopgap SG-GOV-REACH-A-citizenship).
2. County Medicaid work requirement (registered stopgap SG-GOV-REACH-B-medicaid-coverage).
3. County universal preschool (registered stopgap SG-GOV-REACH-B-preschool-enrollment).
4. Federal repeal of the Medicaid work requirement, through the same records as item 2.
5. Federal "adopt an income tax" (defect 16).
6. Federal balanced operating budget for any person (defects 9 and 10); the national economy ignores it by registered stopgap SG-WORLD-macro-public-budget.
7. State unemployment weekly maximum (registered stopgap SG-WORLD-jobs-benefits-terms).
8. State unemployment insurance row (read only by the bench's law list, `src/core2/modules/laws.ts:423`).
9. Federal SNAP maximum (read only by the same list, `src/core2/modules/laws.ts:421`).
10. Federal Medicaid matching rate (read only by the same list, `src/core2/modules/laws.ts:424`).

## Paths that came back clean

- **No dice.** No seeded roll or fixed percentage picked any vote, filing, signature or effect. The only seeded draw is each person's opening political lean, which is part of generating who exists.
- **The journal balances.** Every debit has its credit, and Megan Mullen's paycheck reached the account to the cent.
- **Withholding is sourced.** The federal and state income tax, the Social Security wage base and the Medicare rate come from cited rows.
- **No state, city or GEOID in the law logic** apart from defects 7 and 17. Lydia, South Carolina and county 45031 appear only in data.
- **Starting-law budget changes are applied once a year.** A pension and a highway-to-transit law at the opening each changed the state budget once per fiscal year, at their recorded size.
- **Three suspected defects were checked and are not defects.** Every place whose effective-date rule needs session end dates has them. One agent thought the county's 8,253 owned homes had no owners among the people; it had read a file holding only voters and the player's household. The balanced budget cut 13 lines once each, not one line 13 times.

## Not reached

- A sales-tax record on one purchase and a property-tax payment; neither is in the durable log.
- The player character Paul Mullen's pay. Nobody played the character, who declined every shift and earned $0 each month.
- A state act's path through two chambers and the governor, because no state session ended in the 400 days.
- The bench screens beyond "what changed" and the government view.

## What happens next

The defects go to the lanes that own their files, through the CTO. Nothing is fixed yet; all 25 are open.

- **OPUS-GOV:** defects 1 to 20, 23, 24 and 25 (legislature, world lawmaking, laws, law reach, budgets, executive, session and effective-date data).
- **OPUS-PEOPLE:** defects 21 and 22 (bring-it-up, views, the life journal).
- **OPUS-WORLD:** none directly. The macro gap after defect 10 is its registered stopgap.

## Method

The world was the played world (`buildBenchWorld`, two-level population, every module installed, bookkeeping off). The place is Lydia, South Carolina, an unincorporated place with GEOID 4543135, governed by Darlington County (county 45031). The seed was 1791948706110-ab2db744ab80, drawn from the clock, at head fd3574c9. The drawn span was 184 days, from January 20 to July 23, 2025. The same seed then ran 400 days, to February 24, 2026, to reach Congress's year-end votes. The first 184 days matched exactly.

Ten Haiku agents ran at once, read-only, and each traced one path, 10 paths in all. The paths were bill filing, member votes, executive action, county law effects and repeal, and day-one laws for one household. The others were federal law, state law, the county budget's money, the outcome web with news and screens, and one rule in all 56 places. Each agent's report is in `paths/`. The run record is `run.json`, and the script is `run-script.ts.txt`.
