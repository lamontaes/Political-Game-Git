# Episode: neighbors fall out over a vote

Slug `neighbors-fall-out-over-a-vote`. Types: `argument`. Season: holding office, after a vote. Scene researcher (Oct 27). Calibration only: no real name or quoted line ships.

## Sources read (for calibration)

- WCAX, "Windham votes to shutter elementary school," Sept. 8, 2021 (https://www.wcax.com/2021/09/08/windham-votes-shutter-elementary-school). **Opened in full.** Town vote to close the school, 137 to 135. A parent for closing: "The school is not bad, but I just don't think it has all the opportunities." A parent against: "taking away their school right now is heartbreaking." The town clerk: "We're a small town and people are impassioned for both sides." A parent warned it could "rip our community more apart," after earlier splits over windmills and a state merger law.
- Bennington Banner, "Following second vote, Windham Elementary to stay open," Nov. 2, 2021 (https://www.benningtonbanner.com/following-second-vote-windham-elementary-to-stay-open/article_ba34d3d0-0159-11ed-808f-634cf5e02677.html). **Opened in full.** Revote 142 to 139 on a petition over confusing ballot wording. A parent for closing: "The results show that it's clear the town still remains very divided." The board vice chair called on parents on both sides to work together.
- PBS NewsHour, "How schools are forced to close as rural populations dwindle," Nov. 27, 2018 (https://www.pbs.org/newshour/show/how-schools-are-forced-to-close-as-rural-populations-dwindle). **Opened in full.** Arena, Wisconsin. The superintendent said the area is aging, enrollment pays the bills and voters had refused a tax increase two years earlier, so he had no real choice. A retired teacher: "Neighbors stopped speaking to neighbors, and friendships were divided." A citizens' group leader: "I was part of the fight to keep the school open. We lost."
- Search summaries only (pages not opened): Pasadena, California 4-3 board vote to close two schools (Patch); Lawrence, Kansas, 2003 closures (LJWorld); Fairfax, California recall over housing, Oct. 2025 (CBS SF, opened, no friendship detail).
- Not found: a named pair of neighbors in a local news story. The Arena teacher's sentence is the only first-hand statement of the cost; the rest is the sides' reasons.

## Fact packet (what happens, in substance)

1. A small body (a town meeting, a school board) votes on closing a school the town has had for generations. The margin is thin.
2. The side that wanted it open says the school is why families bought homes there and why the town holds together; closing it takes the town's center.
3. The side that wanted it closed says the school offers less than others, enrollment and money are falling and a tax increase already failed; they say they had no real choice.
4. Voters on each side are neighbors, fellow parents and church or club friends. Each takes the other's vote as a judgment on their children and their town.
5. After the vote, the sides stop speaking in the store, at the school and on the street. A retired teacher says neighbors stopped speaking to neighbors and friendships were divided.
6. The losing side organizes: a petition, a revote, a citizens' group. The winning side hears it as refusing to accept the result.
7. Officials call for both sides to work together; neither side moves first. Parents say they expect another fight next year.
8. What changed: friendships cooled for years, some families moved their children elsewhere, and the next vote is already expected to be close.

## Ask the engine

Read from code and data (director files, `src/core2/modules/voting.ts`, `recalls.ts`); not run in a played world, so no record ids are claimed. Please confirm with `buildBenchWorld` and a drawn place before the producer item is built.

| Line | Record                                                                    | Result                                                                        |
| ---- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1    | A body's vote on a measure (`voting.ts`)                                  | Record exists; `argument` does not fire on it                                 |
| 2-3  | Each side's reasons                                                       | No record exists; a vote carries no stated reasons per voter                  |
| 4    | Ties between neighbors (relationship threads)                             | Record exists                                                                 |
| 5    | Thread turn `soured` (`ledger.ts`, from a tie moment on a souring thread) | Record exists; `argument` fires on it, but only after a tie moment is written |
| 6    | Petition or revote                                                        | No record exists                                                              |
| 7    | An official's call for unity                                              | No record exists                                                              |
| 8    | Lasting cost on the tie and a later vote                                  | Record exists for the tie; nothing reads the next vote                        |

The `argument` type awaits `record:dispute-over-money`, `dispute-over-rules` or `dispute-over-belief`. Only the type file names them; no engine writes them.

## Gaps

- No engine writes a dispute record when a vote lands on a voter's neighbor or child; nothing links a vote to a tie moment. Producer (lead director), reading the vote record and the places where it bites; the engine side (neighbors who care) is `people` / relationship engine.
- A vote keeps no reasons or stances per voter, so neither side can say why. Engine (voting, `src/core2/modules/voting.ts`).
- A revote or petition after a close result is not a record. Engine (voting and recalls).
- Setting: the `argument` type lists home, workplace, school and public; a town meeting hall and a store aisle should read from place kind. Producer (lead director).
- Lines: the bank has a vote-and-grocery-aisle argument but nothing for a school, a street or a parent standing in a hallway; the existing lines make the voter the target. Lines.

## Lines the bank needs

Speakers are the neighbor who lost (asker) and the one who voted (asked). Substance only.

- Asker, by top trait and tie: a close friend says the vote felt personal and names what the school was for their child; a hot-tempered neighbor says the voter sold the town; a reserved one says nothing happened but stops waving; a stranger-tie voter states a fact about the cost.
- Asked: explains the reason in numbers or in what they feared, by trait; a conscientious voter says they lost sleep; a proud one says it was the right call and will not apologize; a conflict-averse one asks to talk later.
- Witness: a third neighbor says they are tired of the sides and wants both at one table; or goes quiet and leaves.
- Four replies where the player is asked or standing between: hear them out, defend the vote, propose a meeting for both sides, step away. Each moves the tie differently and is read by the next talk.

## Other lives the same scene covers

- Windham, Vermont, Sept.-Nov. 2021: the revote leaves the town divided (WCAX, Bennington Banner, opened).
- Lawrence, Kansas, 2003, school closings that opponents called a betrayal of voters who had rejected a bond (LJWorld summary, not opened).
