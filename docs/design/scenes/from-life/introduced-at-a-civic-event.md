# Episode: introduced to someone at a civic event, and the tie matters later

Slug `introduced-at-a-civic-event`. Season: meeting people. Types: `first-meeting`, `becoming-friends`. Words research, Oct 27, 2026. Calibration only: nothing here ships; no real name or quoted line goes into any bank or player-facing file.

## Sources read (for calibration)

- **Opened in full (WebFetch, which returns an answer to my prompt, not raw text):** Louis Harris (a sitting Mukilteo, Washington councilman), letter to the editor, Lynnwood Times, Oct 7, 2025, https://lynnwoodtimes.com/?p=48078 . He knocked on a door in summer 2020 and expected two minutes. "turned into a twenty-minute conversation about community, service, and values." The resident, a Mukilteo woman, "already knew who I was and appreciated the work I was doing," and let him put a sign in her yard. She started attending council meetings, told him over coffee she was nearing retirement and "wanted to give more back to her city," and he later endorsed her for council. A supporter's opinion piece, so one side only. (A search summary dated it Jan 2026; the page itself says Oct 7, 2025.)
- **Opened:** Arkansas Democrat-Gazette, "Community activist began as a PTA council president," Sept 6, 2026, https://www.arkansasonline.com/news/2026/sep/06/community-activist-began-as-a-pta-council/ . A Little Rock woman started in her children's school PTA ("wanting to keep an eye on them"), later joined groups whose members urged her to run for council (she lost in 1974, "kept my interest up"), and two friends brought her into a state women's foundation. The article does not say who first recruited her, so it fits the tie, not the introduction.
- **Opened:** Fortune, May 5, 2016, https://fortune.com/2016/05/05/valerie-jarrett-michelle-obama , and the PBS Frontline interview of Aug 20, 2012, https://www.pbs.org/wgbh/pages/frontline/government-elections-politics/choice-2012/the-frontline-interview-valerie-jarrett . A city official met a young lawyer's fiancé at a dinner set up to recruit her; the tie ran for decades. A dinner, not a civic event.
- **Search summaries only (not opened):** Dallas News on an Arlington teen volunteer and a council campaign, Nov 30, 2020 (page would not load); n+1, "The Hi-Neighbor Mayor" (page would not load). I searched for a block-party or church-supper introduction and found none documented; the door-knock is the closest real match.

## Fact packet (what happens, in substance)

1. A council member is running for re-election and walks a street, door by door.
2. At one house, a resident answers who already knows who they are and follows local government.
3. The visit planned for two minutes runs twenty. The resident asks pointed questions about the city's future.
4. The resident lets a sign go in the yard. That is a small public yes.
5. Afterward the resident starts attending council meetings, so the two see each other there.
6. Over coffee the resident says they have time and want to give back.
7. The council member sees potential and keeps meeting them to talk through city policy.
8. The council member later endorses them when they run for the same body.
9. What changed: a stranger became a known face, then a friend, then a successor.

## Ask the engine

Records: `campaigns.ts` canvass writes `api.relationship(canvasser, resident, "contact", 0.1)` (line 943) and the resident's impression row; `first-meeting` awaits producers `canvass-visit` and `relationship:contact:introduced:maintained`.

| Packet line                          | Record in the played world                                             | Fires?                                             |
| ------------------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------- |
| 1 canvass day                        | `takeCampaignDayChoice(..., "canvass")` doors knocked                  | exists, nothing fires                              |
| 2 a resident who follows the council | civic interest/views on the person; no "follows local government" flag | record exists in part, nothing fires               |
| 3 long talk at the door              | contact weight and rapport on the visit                                | exists, nothing fires: no `canvass-visit` producer |
| 4 yard sign                          | no sign record                                                         | no record                                          |
| 5 attends meetings                   | `meetings.ts` attendees                                                | exists, nothing fires                              |
| 6 offers time                        | volunteer affordance in `drives.json` (`known-group`)                  | exists, nothing fires                              |
| 7 mentoring talks                    | `tie:` thread turning "grew"                                           | exists; `becoming-friends` fires on it             |
| 8 endorsement                        | no endorsement record                                                  | no record                                          |
| 9 successor runs                     | filing record of the resident                                          | exists, nothing fires                              |

## Gaps and where each goes

- **Producer (lead director):** a `canvass-visit` record written when a door is answered, so `first-meeting` can fire with the canvasser as opener (its second cause is waiting on it). Marked: lines needed too.
- **Producer (lead director):** the `introduced` producer (`relationship:contact:introduced:maintained`): a mutual contact brings two people together at a venue meeting, cast from the venue's attendees. Nothing writes it today.
- **Engine (campaigns):** a yard sign or public-support record, and an endorsement record that other candidates and voters read.
- **Engine (campaigns, drives):** a volunteer signing on after a talk with the candidate should write one record the next canvass reads (`volunteerIds` exists on the campaign).
- **Lines:** only four lead sentences and the greeting move exist; nothing says what a newcomer or an introducer says at a civic event.

## Lines the bank needs (substance only)

- **Introducer (by tie to the player):** brings the two over and says why each should know the other. A close friend vouches warmly; an acquaintance does it out of manners; a rival's friend does it with a hook.
- **Newcomer (by trait):** a bold one states what they came for; a shy one asks a question; a curious one asks about the town.
- **Met person (by trait):** warm and open, busy and brief, or guarded until they hear what is wanted.
- **Four reply stances where the player answers:** warm and curious (ask more); direct (say what you want); modest (deflect to the other person); wary (keep it short, step back).
- **Closing beat:** trade a way to find each other again (a meeting night, a phone call).

## Other lives the same scene covers

- A Little Rock PTA officer whose fellow members, in time, pushed her toward a council race (Arkansas Democrat-Gazette, Sept 6, 2026, opened).
- A city official who meets a candidate's partner at a set-up dinner, and the tie outlasts the job (Fortune, May 5, 2016, opened).
