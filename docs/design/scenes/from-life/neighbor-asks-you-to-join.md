# Episode: a neighbor asks you to join a local cause, and how you answer

Slug `neighbor-asks-you-to-join`. Season: meeting people, then the campaign season. Types: `cause-invite`. Words research, Oct 27, 2026. Calibration only: nothing here ships; no real name or quoted line goes into any bank or player-facing file.

## Sources read (for calibration)

- **Opened (WebFetch, which returns an answer to my prompt, not raw text):** Rich Newberg's interview of Lois Gibbs, Feb 15, 2021, https://digital.buffalolib.org/document/2350 . In 1978 a Love Canal homeowners' group went door to door with a petition to close the 99th Street School, taken to Albany Aug 2, 1978. "only one door of the 853 doors that we we collectively knocked on was slammed in our face." One family signed though a plant worker lived there: the chemical in the backyard was one he got paid extra to work with. The page does not say what was said at each door.
- **Opened:** Americans Who Tell the Truth portrait of Gibbs, posted 2012, updated 2022, https://americanswhotellthetruth.org/portraits/lois-gibbs/ . She first waited for someone to tell her what to do, then: "And then when nobody came, I went and knocked on doors." She could not afford to move.
- **Opened:** The Yonkers Ledger, July 12, 2023, http://www.theyonkersledger.com/housing/neighbors-organize-to-protect-community-against-zoning-changes/3886/ . A park neighbors' association formed in 2013 with a handful of neighbors; an April 1 newsletter pleaded for "letter-writing and petition campaigns." Results: over 200 letters, a 300-name paper petition, 158 online, 12 speakers at the zoning board. It does not describe any single ask or reply.
- **Search summaries only (not opened):** a Denver petition against a variance that got 48 neighbors but none of the six abutting houses (search result, no date seen); Austin Chronicle and Austin Monitor on neighborhood-association petitions in zoning fights (1995, 2009, 2012); a New York blogger who politely said no to a school-board ask (rogerogreen.com, Nov 2011).

## Fact packet (what happens, in substance)

1. Something near home goes wrong (a school over a hazard, a rezoning, a park); the neighbors feel it.
2. One neighbor, who has waited for someone else to act, decides to act and starts asking people they know.
3. The ask is small and specific: sign the paper, come Thursday, write a letter.
4. Most answer yes, because they have seen the problem themselves (sick children, a lot that will change).
5. Some sign for a reason that costs them: a household whose earner works for the thing complained about.
6. One door closes on the asker. The count is remembered for decades as the exception.
7. Those who sign are asked for more: a meeting, a speech, a bus ride to the hearing.
8. What changed: a list of names became a group, the group got a name and an officer, and the town heard it.

## Ask the engine

Records: `drives.ts` `share-drive` writes `cause.shared` plus a "contact" tie (the type's one cause); `join-cause-group` writes `cause-group.joined`; `purpose-arcs.json` `join-cause` has replies ask, agree, decline, deflect and endings `joined`, `heard-out`, `not-yours`, `dodged`.

| Packet line                        | Record in the played world                           | Fires?                                                           |
| ---------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| 1 local trouble                    | `drive.formed` and hazard/zoning records             | exists, nothing fires the neighbors as a group                   |
| 2 one neighbor starts asking       | `cause.shared` with `counterpart`                    | exists, `cause-invite` fires                                     |
| 3 specific ask (sign, come, write) | the group's meeting and petition; no petition record | no record                                                        |
| 4 yes because they saw it          | the asked person's own view and household            | exists, `joined` ending fires                                    |
| 5 yes at a cost                    | trait/household stake on the asked side              | exists, nothing reads it in the lines                            |
| 6 a no, remembered                 | `not-yours` ending; `keeps: none`                    | fires, writes nothing                                            |
| 7 asked for more                   | `follow`/`again` press turn                          | exists, fires                                                    |
| 8 group grows                      | `cause-group.founded` and `.joined`                  | exists; the scene's reply does not write it (`keeps` is a label) |

## Gaps and where each goes

- **Producer (lead director):** the ending's `keeps: promise` writes nothing. A yes should call the `join-cause-group` effect so the next canvass or hearing counts the person (already filed as `words-scene-ending-writes-its-record`). A no should write a small tie cost the asker remembers.
- **Engine (drives):** a petition or sign-up sheet record (names, counts, the day sent), so line 3, the 853-door count, and a hearing turnout can be read by news and officials.
- **Engine (drives, households):** a cost-bearing yes (a worker at the thing complained about; a business owner near the fight) has the household stake but the lines do not read it. Producer item for the words lead.
- **Lines:** 172 `join-cause` pieces exist, tagged by step and role only; none keys on the asked person's top trait or tie to the asker (calm 59, guarded 54, glad 21, rest under 15), and none says why the asked person agrees or declines.

## Lines the bank needs (substance only)

- **Asker (by trait and tie):** a close neighbor says they need you and why you in particular; an eager stranger pleads; a shy one asks for the smallest thing first. A neighbor who waited says no one else came.
- **Asked (by trait and tie):** an agreeable person says yes at once; a cautious one asks what it takes; a busy one names the night; a principled one declines on the merits; someone with a stake says so aloud and signs anyway.
- **Four reply stances:** ask (what would it take); agree (put me down); decline (not mine, or I disagree); deflect (the time is wrong).
- **Asker's turn after a no:** accept, leave a flyer; press once, naming what the asked person has seen; warn it will pass anyway.
- **Asker's close after a yes:** thank them, tell them when and where, hand them the next smallest task.

## Other lives the same scene covers

- A park neighborhood association asking neighbors for letters, a petition and a bus to the zoning hearing (Yonkers Ledger, July 12, 2023, opened).
- A resident turned down by a neighbor who would not sign a petition against a variance (Denver; search summary only, undated).
