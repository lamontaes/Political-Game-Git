# Episode: the town hall where a resident will not be talked past

Helper E (scene builder), Oct 27, 2026. Calibration only: nothing here ships. No real name or quoted line appears in any player-facing file.

## Source

- Roll Call, "Specter faces rambunctious crowd at town hall meeting", Aug 11, 2009, https://rollcall.com/2009/08/11/specter-faces-rambunctious-crowd-at-town-hall-meeting/ , and CNN's report of the same evening, https://edition.cnn.com/2009/POLITICS/08/11/specter.town.hall/index.html . A senator held a public meeting at a community college in Lebanon, Pennsylvania, on a health bill. About 250 people came, many hostile to the part of the bill that mattered most to them; the senator took about thirty questions and comments over more than an hour, was booed and shouted at, and answered anyway. One resident told him the officials would still be there after he was gone. His comment the next day was that those who shouted were not the whole of the country, and should still be heard.
- Pattern check (same shape, other lives): the August 2009 recess meetings held by many House members that summer; a county commissioners' public meeting where a resident presses a board on a tax bill (local news, any year); a state legislator's coffee hour that turns on one bill. Used in step 5 below.

## Fact packet (substance, not words)

1. **Who.** An elected official holding a public meeting, and a resident who stood up with a question. The resident has a stake in the answer (a premium, a bill, a road).
2. **Trigger on the record.** The official held the meeting (not required by law); the hall filled; each resident asked about the question they feel most strongly about; the official answered, or declined to.
3. **The moment.** The official's answer on that question is not what the resident came to hear. The resident says so, and says what the answer will cost them. Others in the room are listening.
4. **What the resident wants.** Not a debate prize: to be taken seriously, to hear a reason, or a promise to change.
5. **The choice.** Stand by the answer and say why; give some ground; offer to talk privately after; move on to the next hand.
6. **What came after.** The official stayed for the whole hour and took the questions. The next morning the official said the loud ones were heard but were not everyone, and that the anger had causes beyond the bill. The press printed the evening, not the answer.
7. **What the moment is.** A meeting is a record for everyone in the room: the resident carries the official's answer away, and the town hears about it.

## Ask the engine (drawn places, seed in the PR body)

| Line of the packet                       | Record in the played world                                                                           | Fires?                                                                                    |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1 official and a resident with a stake   | `townHalls` row: host, attendees, each asker's question (`meetings.ts` `holdTownHall`); `concerns()` | exists                                                                                    |
| 2 the meeting, who asked what            | `town-hall` event (`personIds` host then attendees; facts `townHallId`, `hostId`, `questions`)       | exists, **fires the office-hours scene, whose lines are about a lost job or an eviction** |
| 3 the answer and the resident's own view | `answers[].position` (the host's stand) and `viewOn` (the resident's)                                | exists, **nothing reads them**                                                            |
| 4 what changed in the room               | `moved` (warmth changes) and `makeStatements` causes                                                 | exists                                                                                    |
| 5 the host's choice in the room          | the host's answers come from the player's choices or the host's own views                            | exists                                                                                    |
| 6 the press and the next day             | `news: true` on the event; a printed story                                                           | exists                                                                                    |

## Gaps and where each goes

- **Director (this PR, lead `words`):** the town-hall cause is moved from office-hours to its own situation type, `town-hall-question`, whose lines are about the resident's question and the host's answer to it (agreeing, opposing, or none given), read from the `townHalls` row and the resident's own stand on the question. Replaces the cast of the generic scene; no layering.
- **Director (general), lead `words`:** an ending's `keeps` is a label and nothing writes it in play (filed with the previous episode as `words-scene-ending-writes-its-record`). This scene's outcomes are the same kind.
- No engine item: every record the scene reads exists.

## Producer coverage (step 5)

The same producer covers a House member's August recess meeting on a national bill (the host's answer is their recorded stand on the bill's question), a county commissioner's meeting on a tax bill, and a state legislator's coffee hour; it differs only in which question each resident asked and what the host answered. A resident whose own stand agrees with the host's gets a different scene from the same producer.
