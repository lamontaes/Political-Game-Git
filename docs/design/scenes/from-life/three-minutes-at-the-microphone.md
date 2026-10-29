# Episode: three minutes at the microphone (a council or county board's public hearing)

Slug `three-minutes-at-the-microphone`. Types: `public-hearing`. Season: holding office, and the resident's side of it. Calibration only: no real name or quoted line goes into any bank. Research note for the words lead; the producer and engine gaps below are for the leads named in each row.

## Sources read (for calibration)

Opened in full (fetched this pass):

1. Pasadena Independent via heysocal, Sept 15, 2016, https://notices.heysocal.com/2016/09/15/public-outcry-coerces-council-to-re-evaluate-public-hearing-process . A hotel hearing on Aug 15 began 7:22 p.m., speakers waited about three and a half hours, and it ran 4 hours 44 minutes. An activist described every seat filled, "about 20 folks clinging to the walls." The mayor asked staff to review; staff called the process reasonable; the mayor said "the process is a legitimate process"; one member said "Hearing fatigue." Council took no action on procedure and had approved the project.
2. Community Impact, Highland Village, Texas, council meeting March 28, 2023 (published April 6), https://communityimpact.com/flower-mound-highland-village-argyle/government/initial-townhome-development-application-denied-by-highland-village-council/ . Developers spoke first. Eleven residents spoke (backyard sight lines, traffic beside an elementary school, density, "residents did not want it"); over 40 filled out pro forms without speaking. The mayor voted no and said resident feedback was his main reason, with nearly every owner within 200 feet filing a protest. One member said opinion was mixed (the pro forms); another said most who contacted him opposed it. The vote was 4-3 to approve, but a valid protest petition required a supermajority, so it failed, without prejudice.
3. City of Raleigh, NC, public comment page (undated, current), https://raleighnc.gov/petition-address-city-council . Sign up online or by phone by 3 p.m. the Friday before; name, address, phone, email. Three minutes each for up to 36 speakers, two minutes for 37 to 54, one minute for 55 to 108; the presiding officer can adjust. One turn per person, no giving time away, only pre-registered speakers, "Council members generally won't respond directly."

Seen only as search summaries (not opened in full): Stonecrest, Georgia speaker card handed to the clerk before public comment (https://www.stonecrestga.gov/DocumentCenter/View/653/Public-Comment-Form-PDF); Long Beach, California drops to 90 seconds at 10 or more speakers; Mukilteo, Washington, one turn per item (https://mukilteowa.gov/DocumentCenter/View/1374); Riverton, Missouri, mayor voted against a rezone because opposed neighbors outnumbered those who had softened (https://county10.com/riverton-city-council-denies-presbyterian-church-rezone-request-on-third-reading/ , page returned 403). I did not find or open meeting minutes that list speakers; sources 1 and 2 name speakers in news only.

## Fact packet (what happens, in substance)

- **Who:** residents with a stake near the item (a backyard, a street, a school), a few for it, many who wrote or filled a form and did not speak. The chair is the mayor or board president.
- **Sign-up:** a card or form to the clerk before comment opens, with name and address; a deadline in some places; a cap on speakers.
- **Trigger:** a bill or application on the agenda for a vote, after the applicant presents.
- **Time:** three minutes, shorter as the list grows; the chair can change it. Wait can be hours.
- **At the microphone:** the chair calls the name, the resident gives name and address, says what the item does to them and what they want (vote no, wait, hold a meeting).
- **The chair's rules:** one turn, no yielding time, speak to the chair, no answers during comment; staff may be asked to reply.
- **Members after:** most say nothing during comment; later one or two say what they heard (mixed, or most who wrote opposed).
- **The vote:** members vote on their own reasons; the speakers' balance is one of them. A protest rule can change what counts as passing.
- **After:** the room thins; the resident learns the result from the vote or the paper; a complaint about the process can reopen the process, not the vote.

## Ask the engine

| Packet line                                             | Record and what fires                                                                                                                                                                                                                  | Files                                                                                                                   |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Residents with a stake speak                            | Record exists, type fires. `remark:<bill>:<person>` rows (kind `public-comment`, position, `signedUp`) and one `public-comment:<bill>` event; `public-hearing` casts the speaker from the event's `personIds` (`causeNames: subject`). | `src/core2/modules/meetings.ts` 395-460; `src/director/hearing-scenes.test.ts`; `situation-types.json` `public-hearing` |
| Sign-up                                                 | Record exists, no scene. `signUpToSpeak` writes `signedUp: true`; no clerk, card, deadline or cap.                                                                                                                                     | `meetings.ts` 270-300                                                                                                   |
| Trigger bill on the agenda                              | Record exists, type fires on the comment event, not on the agenda.                                                                                                                                                                     | `meetings.ts` `beforeVote` hook                                                                                         |
| Three minutes, and shorter on a long list               | No record. Only `publicCommentSpeakers` (how many speak). Lines say "three minutes" and "a minute left" with nothing behind them.                                                                                                      | `src/core2/data/meetings/parameters.json`                                                                               |
| At the microphone                                       | Type fires: narrate, call to order, state name, tell. Lines exist for tell, request, ask, confront.                                                                                                                                    | `data/english/parts/scene-talk.json` (`hearing-testify`)                                                                |
| Chair's rules (one turn, no answers, address the chair) | Lines only (`refuse`, `warn`, `answer`); no chair rule record, so the warning has no cause.                                                                                                                                            | `scene-talk.json`                                                                                                       |
| Members' words after                                    | Record exists, nothing fires. Votes carry reasons per member (`lobby` includes the room), but no scene or journal line has a member say what they heard.                                                                               | `legislature.ts` 2261-2315                                                                                              |
| Did the vote move?                                      | Record exists, aggregate only. `roomTerm` adds `commentWeight` (0.15) times the for/against balance to every member's reasons, saturating at three speakers. It is not tied to who spoke, and no member's stance cites a speaker.      | `meetings.ts` 465-475; `legislature.ts` positionTerms                                                                   |
| Does testimony reach a member's view?                   | Yes for the room, no for the person. `deliverSpeech` hears each comment to members and speakers (views engine moves listeners by standing). A member's later retelling is not a scene.                                                 | `meetings.ts` 411-440; `speech.ts` 100                                                                                  |
| Protest rule changes the passing bar                    | No record in meetings.                                                                                                                                                                                                                 | none found                                                                                                              |
| Process complaint reopens procedure                     | No record.                                                                                                                                                                                                                             | none found                                                                                                              |

Player as member: `public-hearing` binds the speaker as `subject` and the cause must name the subject, so a player who sits as a member never gets this scene; only the resident does (inferred from `situation-types.json`, not from a played world).

## Gaps

| Gap                                                                                                                   | Kind                                                                                       | Owner               |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------- |
| The player as member hearing a resident has no scene; the chair and member roles are cast but never the player's seat | producer (cast the player as `members`, with four replies and a write of `heard:<remark>`) | lead director       |
| A member's vote reason cannot cite a speaker or a form; only a room balance                                           | engine (record who moved whom, as a reason with the remark id, so `ask-why` can name it)   | legislature / views |
| No sign-up step, cap, deadline or per-speaker time (shorter on a long list); the lines imply them                     | engine (meetings: chair rule row, speaker cap, time by list length, read by the scene)     | meetings            |
| Members' after-vote words ("most who wrote opposed") never fire                                                       | producer (scene or journal line from the vote's reasons)                                   | lead director       |
| Resident replies that ask for a delay or a second hearing write nothing                                               | engine (a request row the chair can move, read by the next agenda)                         | meetings            |
| Protest petition raises the passing bar                                                                               | engine (law in force read by the vote)                                                     | legislature         |
| Lines carry no cause or trait for the resident's stake (backyard, school, rent)                                       | lines                                                                                      | words               |

## Lines the bank needs

The resident, by cause (what their stake is) and trait: next to it (sight lines, noise), school or children nearby, renter afraid of price, owner of a small business, long-time resident who "has seen this before," a first-time speaker with notes. Each in a nervous, a steady and a sharp manner.

The chair: the call by name, the time and the light, the one-turn rule, "address the chair," "staff, can you answer that," a short night and a late night (after nine), a calm chair and a hurried one.

Player as a member hearing a resident (four stances):

- Thank and engage: asks what it would cost them or where the problem is.
- Question: asks staff, in the open, a fact the resident raised.
- Promise: says the board will look at it before the vote, and means a dated step.
- Stay silent: lets the chair close it; the resident sees no answer.

Player as the resident testifying (four stances):

- Tell: what it does to my street, one fact.
- Request: delay the vote, or a second hearing.
- Confront: they decided before tonight.
- Leave early: gives the time back and sits down.

## Other lives the same scene covers

- A school board meeting where parents speak on a boundary change and the board votes the same night (sources to find; same `remark` rows, a school-board body).
- A county commission hearing on a landfill or a jail where speakers outnumber seats and the chair cuts each to two minutes (the Raleigh shortening rule above, in a county).
