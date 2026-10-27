# Episode: the funeral of someone from your own political life (the venue, the week of the death)

Slug `funeral-of-someone-known`. Types: `funeral`. Season: holding office, and the quiet stretch between votes. Calibration only: nothing here ships as player text; no real name or quoted line is in any bank.

## Sources read (for calibration)

Opened through the fetch tool (it returns a summary of the page, not the page verbatim):

1. Portland Press Herald, Mar. 26, 2015, on the funeral of a three-term former mayor of Westbrook, Maine (https://www.pressherald.com/?p=2643956). He died at home Mar. 15; the service was Mar. 20 at a Congregational church, led by a minister who was his friend. Speakers in order: the son of a former mayor (a friend); the sitting mayor, who had worked with him across party lines and cited a president on extremes being wrong; his city administrator of six years ("an outstanding person to work with and for"); a longtime friend; a radio host and family friend; his partner of four years; his daughter and granddaughter last. His wife had died in 2007. The article reports no request made to any official.
2. Champlain Valley (ABC22/FOX44) on a Vermont governor's remarks before the funeral of a former state senator, aged 84 (https://www.mychamplainvalley.com/news/local-news/gov-scott-to-give-eulogy-at-sen-mazzas-funeral/amp/; no date on the page, "2 years ago"). The governor called him mentor, colleague and friend, and "conscience of the senate"; said he would give the eulogy the next day and was "honored." Who asked him is not stated.
3. CBS News, Jan. 4, 2015, on a New York officer's funeral (https://www.cbsnews.com/news/nypd-officers-again-turn-backs-on-mayor-de-blasio-at-cops-funeral/). The mayor gave the eulogy and urged working together; thousands of officers outside turned their backs on the screen during it and turned around for the commissioner, who had asked for "grieving, not grievance." The mayor did not know the dead officer; kept for the hostile-mourner shape.

Seen only as search summaries: coverage of the Charleston funeral for a state senator (Washington Times, Atlanta Black Star, FSRN, June 2015), which suggests officials' action on the flag was asked of them in public around the funeral, not at the service. Not found: any local page where a family member asked an official for something in the room. The "asked of them" half comes from the engine's own request scene, not from a source.

## Fact packet (what happens, in substance)

- **Who was there:** the sitting mayor, the former mayor's city staff, friends, a radio host, his partner, his daughter. The room was half public life and half home.
- **Tie to the dead:** colleague across the aisle (the mayor); six years of work for him (the administrator); friend and family friend (the others).
- **Trigger on the record:** a sudden death at home at 66; the funeral five days later (effective date).
- **The order of speaking:** public friends first, the sitting mayor and the staff member next, the family last. The family closes the service.
- **What the mayor said, in substance:** that they disagreed across party lines and worked together anyway, and one borrowed line of a principle. She spoke of the working tie, not the private one.
- **What the staff member said:** what it was like to work for him; the daily tie.
- **What the family held:** the closing slot, poems, a nickname for the three of them; the private life the officials did not know.
- **The shape in the other two pages:** a mentor's eulogy given gladly (Vermont); a eulogy given by a mayor who did not know the dead, answered by hostile mourners outside (New York).
- **The choice:** whether to speak, and what to speak about: the shared work, the person, or the cause.
- **What changed after:** nothing is reported; in play, a promise or an old fight taken up, or a fresh grievance, is what would change.

## Ask the engine

Type `funeral` (roles mourners from `present`, family from `subject`, deceased from `counterpart`; setting `venue`; one cause, `feeling:event:life.death` with a counterpart; purpose `funeral-cause`, mourners ask the family, stakes deceased and cause). Played year, New Britain CT, seed `web-morning-1`: fired once, on `person_563685259e1ef3b8:2025-11-30:life.death:person_1d34be038b55b946:2025-11-30`.

| Packet line                                     | Record and firing                                                                                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A death of someone the player knew              | Record exists (`life.death`, counterpart some); the type fires.                                                                                         |
| The player is the sitting mayor, not the family | Record exists; `family` binds to the subject, so the player is cast as family. A colleague at the back of the room is not a case. Nothing fires for it. |
| Funeral on the effective date                   | Timing `effective-date` exists; fires.                                                                                                                  |
| Order of speakers                               | No record: no list of who speaks or in what order.                                                                                                      |
| A eulogy the player gives                       | No record; no choice of whether or what to speak about.                                                                                                 |
| A mourner asks for something                    | Purpose `funeral-cause` exists (promise, decline, ask, deflect); fires for the family; a stake is read from the dead person's open cause.               |
| A cross-party working tie                       | Not checked in this pass whether the tie is kept as a record; the mayor's line needs it.                                                                |
| The family closes the service                   | Nothing fires; the family is only an asked role.                                                                                                        |
| Hostile mourners outside                        | No record: crowd stance toward the official has no scene.                                                                                               |
| A promise made at a funeral changes later       | The ending `promise-made` names `keeps: promise`; whether another engine reads it was not checked in this pass.                                         |

## Gaps

| Gap                                                                                                   | Kind                                                                                                            |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| The player as a colleague or official among the mourners (not the family) is not cast                 | producer (lead director): a second cast row where the subject is a `present` mourner with a tie to the deceased |
| No eulogy scene: choice of whether to speak, and to speak about the work, the person or the cause     | producer (lead director), with lines (words lead)                                                               |
| The service has no order or room: nobody records who spoke before the player                          | engine: venue and events (name the engine that keeps venue occupancy; not found in this pass)                   |
| A hostile or cool crowd toward the official at a funeral                                              | engine: public opinion (a group stance record the scene could read)                                             |
| Bank has the request scene, but one version per move; none by trait of the speaker or tie to the dead | lines (words lead)                                                                                              |

## Lines the bank needs

By trait and tie, substance only.

- **Eulogy, if the player speaks:** four versions by what the player stresses: the shared work; the person; the cause left open; a short thanks and sit down. A colleague of the other party names the disagreement and the work; a staff member names the daily tie; a friend tells one small story.
- **Mourner approaches the player (by tie and trait):** a partner or friend asks quietly for one thing; a loud one asks in front of others; a guarded one only hints.
- **Four replies the player gives:** promise to take it up; put it off to a better day; ask what exactly it was; say this is not the place.
- **The family's side (when the player is not family):** a line to the player, thanking or cool; the closing slot belongs to them.
- **Narration, not dialogue:** where people stand, who sits where; kept to the venue.

## Other lives the same scene covers

- A governor eulogizes the former senator who mentored him (Champlain Valley piece above): player as colleague with a mentor tie, who speaks by choice.
- A mayor eulogizes a dead officer he did not know, while a group outside shows its anger (CBS News, Jan. 4, 2015, above): player as official with no tie to the dead and a hostile crowd.
