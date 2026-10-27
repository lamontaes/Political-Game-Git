# Episode: not on the list at the table (the polling place, election day)

Slug `trouble-at-the-polling-place`. Types: `polling-place`. Season: election day and night. Calibration only: nothing here ships as player text; no real name or quoted line is in any bank. Rules differ by state, so the packet is the general pattern and each source names its state.

## Sources read (for calibration)

Opened in full:

1. Ohio, a 2004 blog post citing the Canton Repository: Stark County rejected over 500 provisional ballots; some voters were at the right polling place but sat at the wrong table, so their votes went to the wrong precinct. The post says no guidance reached them (https://josephhall.org/blog/right_poll_wrong_precinct/, read Oct 27, 2026). The same room, one table off.
2. Wisconsin, Brown County Clerk release in a local TV story: "voters who are still in line at the time the polls close must be permitted to vote"; the chief inspector announces closing, an End of Line Officer stands behind the last voter, doors are not locked (https://www.nbc26.com/news/local-news/what-you-need-to-know-if-youre-still-in-line-when-the-polls-close, read Oct 27, 2026).
3. Texas, Harris County, March 12, 2018: a voter without photo ID "will still be permitted to vote provisionally", then has six days to show ID to the county voter registrar, or may leave and return with ID before the polls close and vote a regular ballot (https://www.offthekuff.com/wp/?p=85360, read Oct 27, 2026).

Search summaries only (not opened in full; the pages were blocked or unreadable):

4. Ohio Secretary of State directive 2010-79 and a Brennan Center brief (2012): a wrong-precinct provisional ballot is cast but generally not counted, except in poll-worker error. California SOS poll worker guide (2016): a name missing from the roster, or a voter at the wrong precinct who wants to vote there, gets a provisional ballot. North Carolina provisional fact sheet (2019; PDF unreadable).
5. Arizona (12news, 2024) and Texas (Click2Houston, Mar 4, 2026): the Secretary of State asked voters to stay in line at 7 p.m.; over 20 Harris County voting centers were still taking votes at 9:45 p.m.
6. West Virginia voter ID training outline: a worker who has known the voter six months may let them vote a regular ballot; Alaska: an official who knows the voter can waive ID, except first-time registrants without ID; Maine (until 2018): worker affidavit; Florida and Texas guidance: provisional ballot as the fallback.

## Fact packet (what happens, in substance)

- **Who:** a registered voter at their usual polling place; two to four poll workers at the check-in table; neighbors in line behind.
- **Trigger:** the worker looks for the voter in the book and does not find them at that precinct (a redrawn line, a move not filed, a table for the next precinct in the same building).
- **What the worker says:** asks the voter to spell the name, looks again, then says the name is not on the list for this precinct. The worker cannot hand over a regular ballot that is not theirs to give.
- **What the worker offers:** call the county to check (stand to the side; some minutes); or, if the county names another place, go there for a regular ballot; or a provisional ballot here, which is counted once the election office confirms the voter.
- **Voter's reasons:** "I have voted here for years." Often a new district map or a late address change explains it, and the voter was not told.
- **The choice:** wait for the call, drive to the right place before the polls close, vote provisional here, or leave without voting.
- **Where the rule changes by state:** in some states a wrong-precinct provisional ballot is thrown out (Ohio), in others it counts for the contests the voter is eligible for; the worker says only what applies where they are.
- **ID variant:** no accepted photo ID, so a provisional ballot plus a few days to show ID to the county (Texas), or fetch it and come back before closing. A worker who knows the voter may be allowed to pass them (West Virginia, Alaska) or may not (Texas, Florida); the worker is sorry either way.
- **Closing variant:** a long line at closing time; the voter is told to stay in line, and everyone in line at closing votes.
- **After:** the worker writes the case in the log; the election office checks the provisional ballot after election day; the voter can look up whether it counted.

## Ask the engine

The `polling-place` type has `awaitingProducer: election-day`; the cause never fires. The bench serves its own election morning and ballot instead (`electionDay` in `src/bench/election-night.ts`, `src/director/polling-place.ts`: the voter goes, marks a ballot through `castBallot`, and the poll workers named by the voting engine are cast). The `poll-problem` lines in `scene-talk.json` exist (the book search, "not on the list for this precinct", the redistricting answer, provisional and across-town offers) but nothing calls them.

| Packet line                       | Engine answer                                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Voter, workers, neighbors         | Record exists and nothing fires: `polling-place:<town>:<precinct>` with `pollWorkers.ids`; roles cast by the type |
| Name not found at this precinct   | No record exists: there is no voter-roll entry per precinct to miss, and no precinct change after redistricting   |
| Worker says "not on the list"     | Record exists and nothing fires: `poll-problem` lines in `scene-talk.json`                                        |
| Call the county / go elsewhere    | No record exists: no election-office answer a worker can read; no other polling place named for the voter         |
| Provisional ballot                | No record exists: `castBallot` writes only a counted ballot; no provisional status and no later review            |
| Reasons (new map, late change)    | No record exists: no redistricting or registration-change record that the worker can name                         |
| Wrong table, same building        | Record exists and nothing fires: one polling place per precinct; no shared sites                                  |
| ID problem, known-voter exception | No record exists: no state ID rule, no cure window; `barredFromVoting` is law-only                                |
| Long line at closing              | No record exists: no waiting time or queue at a polling place; the bench has no closing time                      |
| Log entry, later county check     | No record exists: no poll log and no provisional review in the voting engine                                      |

## Gaps

| Gap                                                           | Kind                                                                                                        |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Nothing produces the `election-day` cause for `polling-place` | producer (lead director): fire it from the bench's election morning when the voter's day stops at the polls |
| No per-voter registered precinct, no change after a redraw    | engine (elections, voting): precinct on the registration, moved by redistricting and by a filed move        |
| No provisional ballot status and no after-day review          | engine (voting): provisional status, reviewed by the election office, counted or not by the law in force    |
| ID rule and cure window by state                              | engine (voting): state law row read at the table; known-voter exception as a law row                        |
| Waiting at the polls and a closing time                       | engine (voting): queue length by turnout and workers; everyone in line at closing votes                     |
| Worker offers depend on what the worker can see               | producer (lead director): offers only from records that exist (county answer, other site)                   |
| Lines for ID, closing and acquaintance variants               | lines (Words): see below                                                                                    |

## Lines the bank needs

Poll worker, by top trait and tie to the voter (stranger, neighbor, someone they know):

- Opens by looking again; asks for the spelling; then says the name is not on the list here.
- Offers, in substance: call the county; name the other place and the hour the polls close; a provisional ballot that counts once the office confirms.
- An acquaintance says they know the voter and still cannot hand over a ballot that is not theirs (or, where the law allows it, passes them), and says so plainly.
- At closing: "stay in line, everyone in line votes", said steadily or wearily.
- Closes by writing it in the log so the county sees it.

Voter, four reply stances:

- **Accept:** take the provisional ballot or wait for the call, and ask what happens next.
- **Challenge:** "I've voted here for years", insist the book is wrong, ask for a supervisor.
- **Ask:** want the reason (the new map), and how many others it has happened to.
- **Leave:** go to the right place, or come back after work, and ask if there is time.

## Other lives the same scene covers

- A voter who moved within the county and did not update the address, offered a provisional ballot for the contests they may vote in (California poll worker guide, search summary).
- A voter in line at closing in a high-turnout precinct, told to stay (Wisconsin, Brown County; Texas, Harris County, 2026).
