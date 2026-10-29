# Episode: the morning after the race, for the winner and the loser (home or office, the day after the count)

Slug `the-morning-after-the-race`. Types: `race-won`, `race-lost`. Season: election day and night. Calibration only: nothing here ships as player text; no real name or quoted line is in any bank.

Owner request (Oct 26, `docs/design/scenes/owner-scene-examples.md`, "Morning after"): the morning-after scene "has purpose" but restates "You're at home." A fix is reported merged (#6147), but it only fixed the restating line. What the morning is for is still open.

## Sources read (for calibration)

Opened in full (fetched, read):

1. Salt Lake City mayor, Nov 2019 (KSL, https://www.ksl.com/article/46669015/sen-luz-escamilla-concedes-to-erin-mendenhall-in-salt-lake-city-mayor-race). The day after the vote, just after 4 p.m., the loser posted a statement: "We had a good conversation and I wished her the best of luck as our city's next mayor." She conceded because 9,744 ballots were left and the lead was "insurmountable." She thanked family, staff and volunteers, and kept her state Senate seat. The winner set a City Hall steps news conference for the next day at 10 a.m. on her transition.
2. Atlanta mayor runoff, won Nov 30, 2021 (AJC, Dec 6, 2021, https://ajc.com/news/atlanta-news/the-race-for-city-hall-atlanta-has-a-new-mayor-what-happens-next/GXZGE3JN75C23JTQYT67VTVQIY). Winner slept about two hours; transition began Wednesday morning with an hour alone with the outgoing mayor and calls to the governor, the House speaker and the police chief. He had a month, $100,000 in city funds for staff and an inauguration, and no chief of staff yet. The loser thanked supporters by email on Friday, said she would work with the new administration, and asked for donations to clear a $10,000 campaign debt. Winner said he'd meet her and was open to a role for her.
3. Greensboro, N.C. mayor, Aug 1, 2022 (WFDD, https://wfdd.org/story/vaughan-retains-mayors-seat-outling-concedes-race). The challenger would not concede for days, "waiting for mail-in ballots," trailing by just over 400 votes, outside recount range. He conceded on Facebook and thanked volunteers and supporters. No call is reported. A refusal that is really a wait on the count.
4. Spokane City Council, Nov 5, 2009 (Spokesman-Review, https://www.spokesman.com/stories/2009/nov/05/gookin-gracious-after-narrow-loss). Two days after a narrow loss, the loser blogged thanks to supporters, asked for his signs back (they could keep them if he ran again), and left a third run open.

Seen only as search summaries (not opened): Bayonne, N.J. 2nd Ward council concession thanking family and volunteers (hudsoncountyview.com); Longmont, Colo. mayor concession ("next steps with supporters over the next few days"; page returned 403); Erie, Pa. mayor, the loser called the winner the next morning, winner then met the outgoing mayor; Seattle mayor 2017, a first reflective morning after hundreds of messages (cascadepbs.org page returned 404).

## Fact packet (what happens, in substance)

- **Who:** winner and loser of the same contest, plus the people who worked it: family, staff, volunteers.
- **Trigger on the record:** the certified-or-counted result (`election-result:<contest>`); in two of the cases the result is not final until days later (ballots left).
- **Winner wakes to calls:** the outgoing officeholder, the governor or other officials, allies; the loser's call, if it comes, comes the next morning or afternoon.
- **Winner's first public words:** a news conference or statement set for the next day, about the transition and working with the loser.
- **Winner's first working day:** a long meeting with the outgoing office-holder, picking a chief of staff, a small transition budget, a month to prepare.
- **Loser's concession:** by call to the winner and a public statement, once the remaining ballots cannot change it; sometimes later, after waiting on the count.
- **Loser's refusal is a wait:** no concession while ballots are uncounted and the margin is inside what could move.
- **Loser thanks staff, family, volunteers** in one public post; names the part they played.
- **Signs and leftovers:** supporters are asked to bring signs back, or told to keep them if there is a next run; a debt may remain and the loser asks for gifts to clear it.
- **What the loser does next:** returns to the seat already held, or leaves the next run open, or offers to work with the winner.
- **What changes after:** the winner may offer the loser a role; the loser's stated plan is the starting record for the next contest.

## Ask the engine

`race-won` and `race-lost` have `timing: at-cause`, caused by `cause:event:election-result` (elections engine). They fire the night of the count. Nothing stages the next day.

| Packet line                            | Record and type                                                                                                                       | Status                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Result trigger                         | `election-result:<contest>` (winnerId, votes); `race-won` / `race-lost` fire on it                                                    | record exists, type fires, on the night only |
| Winner wakes to calls from officials   | officials and allies exist as people with ties; no call is scheduled from the result                                                  | record exists, nothing fires                 |
| Loser's call to the winner             | `race-lost` purpose `concession-call` (supporters ask the candidate to concede) is the closest; the call to the winner is not a scene | record exists, nothing fires                 |
| First public words next day            | registers `address/victory`, `address/concession` exist; no morning-after address                                                     | record exists, nothing fires                 |
| Meeting with the outgoing officeholder | the incumbent is a record; no transition record or meeting                                                                            | no record exists                             |
| Chief of staff and transition money    | no transition budget, no staff-hiring step for an elected executive                                                                   | no record exists (executive engine)          |
| Ballots left, so the loser waits       | no count-in-progress state; a result is final when written                                                                            | no record exists (elections engine)          |
| Staff and volunteers thanked or let go | `volunteerIds` on the campaign row, `gifts` table; no end-of-campaign step                                                            | record exists, nothing fires                 |
| Signs coming down                      | no sign record (and the owner has not asked for one)                                                                                  | no record exists; not needed                 |
| Campaign debt after the loss           | campaign finance rows exist for money in and out; no debt carried past election day                                                   | record exists, nothing fires                 |
| Winner offers the loser a role         | appointments exist in office; no offer tied to a lost contest                                                                         | record exists, nothing fires                 |
| Loser's plan is the next run's start   | `candidacyReasons` and the household `backing` table (see `household-after-the-loss`)                                                 | record exists, partly read                   |

## Gaps

1. **Nothing stages the next day.** After the night scene, the world is quiet until the next event. Kind: producer (lead director): a `morning-after` situation type for the winner (calls and first public words) and one for the loser (thanking the people who worked it), caused by the same `election-result` and timed a day later. Lines too.
2. **Winner's calls have no source.** The calls would be cast from the officials and allies in the winner's ties, but nothing says who calls first. Kind: producer (lead director): cast rule from ties to the outgoing officeholder and the next level up.
3. **No transition record for an executive win.** No meeting with the outgoing mayor, no money, no chief of staff. Kind: engine (executive/offices engine).
4. **No count-in-progress state.** "I won't concede yet" cannot be played because a result is final when written. Kind: engine (elections engine).
5. **End-of-campaign step is missing.** Volunteers and staff thanked or let go; debt left over after a loss. Kind: engine (campaign engine) for the debt and the staff end, then producer.
6. **Winner's offer to the loser.** An appointment offered to someone who just lost. Kind: engine (offices/appointments), then producer.
7. **Lines.** Existing `victory-night` and `concession-call` lines are about the night, with supporters asking. The morning needs a different voice. Kind: lines.

## Lines the bank needs

- **Winner, on the morning:** by trait and tie (steady, giddy, wary, humble). Says, in substance, that sleep did not come; names the first call that mattered; says what the first week is for; speaks of the loser with respect, coldly or with a promise to work with them. One version per top trait.
- **Caller (outgoing officeholder, ally, official):** congratulates, then asks for something (a meeting, a staff pick, a stance). By tie: friend, rival-turned-friendly, someone with an agenda.
- **Loser, to the winner (call):** by trait (gracious, bitter, guarded, proud). Says the count is in or is not yet; congratulates or holds back; says what they will do next (return to the seat, stay in the fight, rest).
- **Loser, to the people who worked it:** thanks the part each played, in terms of what they did; says what happens to the signs, the money owed and the next run.
- **Staff or volunteer (asker):** wants to know whether it was worth it, whether there is a next time, whether they will be kept on. By tie: family, longtime ally, newcomer.
- **Four reply stances where the player answers (loser's morning, to a volunteer):** thank them for the part they played; take the blame for the count; put the question of what's next off for a week; say they will run again.
- **Four reply stances (winner's morning, to a caller):** accept the ask now; ask for time; turn it to what the town needs; keep it short and end the call.

## Other lives the same scene covers

- A first-time council candidate in Bayonne, N.J., who conceded and thanked family, volunteers and residents (hudsoncountyview.com, search summary only): the loser-to-supporters morning.
- A mayoral loser in Erie, Pa. who called the winner next morning, with the winner then meeting the outgoing mayor (digital-release.yourerie.com, search summary only): the call and the first meeting.
