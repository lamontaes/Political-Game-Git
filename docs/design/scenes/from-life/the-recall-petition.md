# Episode: the recall petition, from the people carrying it to the official it names

Slug `the-recall-petition`. Types: `recall`. Season: holding office. Calibration only: nothing here ships as player text; no real name or quoted line is in any bank. Purpose `recall-confront`, causes `recall-petition` and `recall-outcome` (`src/director/data/situation-types.json`, key `recall`).

## Sources read (for calibration)

Opened in full (fetched, read): none. Every page below was read as a fetched summary or a search summary, so treat each fact as second-hand. Two Examiner pages returned HTTP 429 and were not read.

1. SF Standard, Aug. 11, 2021, https://sfstandard.com/2021/08/11/sf-school-board-recall-campaign-signatures-one-month-remaining/ (fetched, summary of the page): two parents started the drive; frustration at slow school reopening. One board member said by email he would not weigh in "unless enough signatures are submitted"; two did not answer.
2. SF Standard, Oct. 18, 2021, https://sfstandard.com/2021/10/18/school-board-recall-scheduled-for-february-2022-along-with-assessor-recorder-election/ (fetched, summary): about 80,000 signatures turned in; at least 51,325 valid needed for each of three members; vote set for Feb. 15, 2022. No response from the members.
3. CBS News Bay Area, Feb. 8, 2022, https://cbsnews.com/amp/sanfrancisco/news/sf-school-board-recall-election-1-week-to-go (fetched, summary): a parent backer said of one member's remarks, "What she said insulted the entire Chinese community"; an opponent said a recall "is a waste of money"; one member answered by saying two named items "I did not bring to the school board"; two declined interviews.
4. Search summaries only (not opened): the Examiner (organizer said about 40 percent of signatures came from nearly 1,000 volunteers at farmers markets and grocery stores), Mission Local (final yes votes about 76, 72 and 69 percent, Feb. 2022), Wikipedia (campaign committee formed Feb. 21, 2021; the page body was cut off and not read).
5. Search summaries only, for the other lives: Village News, July 8, 2021 (https://www.villagenews.com/story/2021/07/08/news/high-school-recall-group-offers-to-pick-up-signatures/66910.html), Fallbrook high school board recall; Yahoo News (https://news.yahoo.com/salem-keizer-school-board-recall-225406327.html), Salem-Keizer recall that failed on signatures.

## Fact packet (what happens, in substance)

- **Who and why:** two local parents form a committee. Their grievance is a list: slow reopening, time spent on other matters, one member's lawsuit and public remarks. It is about the board as a whole, aimed at three people.
- **How the official learned:** the committee's filing and the press, not a visit. The members read of it in the news; the sources show no personal notice.
- **Trigger on the record:** the petition is filed and circulating, with a number of valid signatures required and a deadline.
- **Face to face:** about 1,000 volunteers staffed tables at farmers markets and grocery stores. Backers and opponents argued at those tables; officials were mostly not there.
- **What each wants:** the petitioners want the seat; a signer wants one grievance heard; a bystander thinks it wastes money.
- **The official's choices (substance):** two of three said nothing to the press; one said he would wait until the signatures were in, then listed his own work and named the items he did not bring forward. None resigned.
- **The count:** signatures turned in at about 1.5 times the number needed; the elections office certified them and set a date.
- **Outcome:** the vote removed all three, by 69 to 76 percent yes.
- **What changes after:** the mayor appoints replacements until the next regular election; the board's makeup and its agenda change.

## Ask the engine

| Packet line                  | Record and what fires                                                                                                                              | Files                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Organizer starts a drive     | Record exists, type fires: `recall-petition:<recall id>`, organizer in `personIds`, opener `petitioners`, move `blame`                             | `src/core2/modules/recalls.ts` (emit ~709), `situation-types.json` |
| Grievance list               | Record exists, nothing fires: row holds `question`, optional `cause`, `lawId`; the scene says the threat but no line cites which grievance         | `recalls.ts` (~690)                                                |
| Official learns by the press | Record exists, nothing fires: the event has `news: true` but no `heard` record puts the member in the know before the scene                        | `recalls.ts` (~725)                                                |
| Tables outside stores        | Record exists, nothing fires: `namedSigners` and counted signers exist; no place of signing is kept, so no table or door setting is cast           | `recalls.ts` (~685)                                                |
| Volunteers carry it          | Record does not exist: only one `organizerId`; no volunteer list                                                                                   | `recalls.ts`                                                       |
| Required vs. turned in       | Record exists, nothing fires: `required` and `signatures` are on the row, and `petition-due` writes `status` and counts; no scene reads the margin | `recalls.ts` (~751)                                                |
| Official's reply             | Record does not exist: `scene.reply` is not read by the recall engine; no fight, ignore or reach-out stance changes the vote                       | `recalls.ts`                                                       |
| Resignation option           | Record does not exist: nothing lets the official step down in the petition window                                                                  | `recalls.ts`                                                       |
| Outcome                      | Record exists, type fires: `recall-outcome:<id>:<outcome>` (`failed`, `on-ballot`, `removed`, `kept`), opener `petitioners`, move `tell`           | `recalls.ts` (~849)                                                |
| Replacement appointed        | Record does not exist as a scene cause; the seat refills by the offices engine                                                                     | `src/core2/modules/offices`                                        |

## Gaps

| Gap                                                                                                         | Kind                                                                             |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| School board and state seats are not recallable: `localOffice` admits only city, county and township levels | engine (recalls)                                                                 |
| The official's reply is read by nothing: no stance changes `signatures`, the vote or a resignation          | engine (recalls), with producer (lead director) for the outcome write            |
| No setting or place for signing; every scene is "public" or "home"                                          | producer (lead director): a table-outside-a-store setting from the town's places |
| Opener never names the grievance (`question`, `cause`)                                                      | lines                                                                            |
| The member never hears of the petition before it is public, so the first scene has no "how you found out"   | producer (lead director), reading the news record                                |
| No volunteer list; one organizer stands for the drive                                                       | engine (recalls)                                                                 |
| Margin (signatures against required) is not said in the opener                                              | lines                                                                            |

## Lines the bank needs

Existing bank for `recall-confront` has the table and clipboard scene; these are the missing pieces, to be written in the game's voice by trait and tie, several per speaker.

- **Petitioner (asker):** names the grievance from the row's `question`; says how many signatures are in against how many are needed, as people round it; one version angry, one tired, one civic.
- **Supporter at the table (asker, a signer):** one sentence on what it cost them, tied to a record the player's actions wrote; one who signed against their own councilman's friend.
- **Reply, answer the charge:** takes the grievance and says what the vote was and why, in the official's own manner.
- **Reply, dismiss it:** treats it as politics, will see them on the ballot; a trait-driven edge in the proud and a soft refusal in the guarded.
- **Reply, reach out:** asks for a meeting with the organizers, offers a public hearing; writes `backing` the petitioner reads.
- **Reply, fight:** stands at the table and answers each person who walks up; says the cost of recall out loud.

## Other lives the same scene covers

- A small high school board president facing a drive that turned to door-to-door volunteers because stores would not allow tables (Village News, July 2021, search summary).
- A school board where parents gathered outside the district office during meetings and the drive failed on signatures (Salem-Keizer, Yahoo News, search summary): the `failed` outcome and the official who ignored it.
