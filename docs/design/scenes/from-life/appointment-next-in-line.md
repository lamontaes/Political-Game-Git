# Episode: the appointment, and the person next in line

Scenes from life (`scenes-from-life`), owner's Oct 27 executive brief ("an appointment to make and the person who wanted it"). Calibration only: no real person's name or words ship, and none are in the packet. Written as a researcher's packet for the director engineer (CTO change of role, Oct 27): trigger, place, cast, outcome write and drafted lines are in the item `scene-appointment-next-in-line`. Engine item it waits on: `world-appointment-names-the-appointer`.

## Sources

- GV Wire (Fresno, California), August 24, 2019, read in full: a mayor and city manager named a deputy chief who had not applied as the next police chief after a months-long search (22 applicants, five finalists, an 18-person panel, a second round with the mayor and the outgoing chief). A deputy chief who was a finalist came to the announcement and said he was disappointed, fully supported the choice, would seek feedback and apply again. The outgoing chief, who had promoted the pick, backed the process.
- WBEZ (Chicago), March 28, 2016, read: a mayor passed over the three finalists a police board had named and appointed the department's chief of patrol, a 27-year veteran, as interim superintendent. The page does not report the finalists' reactions.
- Dayton Daily News and Seattle (search summaries; pages not opened in full): a department's interim chief, one of the finalists, was passed over for an outside pick and announced retirement ten days later (Dayton, 2020s); an interim chief was passed over for the permanent job and the mayor said she was disappointed but had moved on (Seattle, 2018).

## Packet

1. A post is open. People inside and outside the department are weighed against each other for it, some formally.
2. The executive chooses someone, and the choice is a trade: the more qualified against the closer, the insider against the outsider.
3. The person next in line is told, or hears, before the public does. In one case they came to the announcement.
4. What they say is plain and short: disappointment said once, support said once, and a question about what would have made the difference.
5. What the executive says is the reason, in substance: experience, trust, a second chance, or a closed door.
6. What changes: the runner-up's tie to the executive (warmer or cooler by what was said), whether they stay, retire, support or apply again, and a line in the history.

## Does the engine fire it?

Asked in played worlds (`buildBenchWorld`, two-level), town appointment rows in drawn places and seeds:

| Place                                        | Posts                     | What the rows hold                                                                                                                                                                                                                                                                  |
| -------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| East Jordan, Michigan (seed `681bf2c856...`) | 8 filled by the appointer | each row keeps five ranked candidates; the runner-up is an alive full person; margins from 0 (police chief: 1.76 against 1.76) to 0.24 (city clerk); the finance director's runner-up is more qualified than the appointee (0.95 against 0.80) and less aligned (0.75 against 0.89) |
| Rohrersville, Maryland; Scottsburg, New York | none                      | no appointed heads in the town's form of government                                                                                                                                                                                                                                 |

- **Exists:** the appointment row (`appointmentsIn`), with `reasons`: the five candidates the appointer weighed, each with qualification, alignment and acquaintance, the records the qualification was read from and the total. The runner-up is a full person in these towns.
- **Exists, nothing fires:** `official-appointed` is recorded and names only the appointee. The appointer gets no moment from it (Woodway, Texas: a replacement city attorney named on January 15, 2026 left the mayor's moments empty). Engine item `world-appointment-names-the-appointer`.
- **Does not exist:** that the runner-up wanted the post. Reasons rank everyone weighed; none records an application. The scene therefore says only that they were weighed, never that they hoped.
- **Does not exist:** an acting or interim head (Dayton, Seattle). Engine item `world-department-head-vacancy-is-recorded` is the vacancy; an acting holder is a further record not filed.
- **Does not exist:** what a passed-over person does next (stay, retire, support, apply again). The scene's reply is recorded as `scene.reply` and a tie contact; nothing reads it.

## Write-back proposed

`scene.reply` with the cause record id and the tie contact between the two, as every purpose scene does. For the engine lead: a kept record `passed-over:<post>:<person>` read by the candidacy and press engines (a runner-up who later files for the post's office, a story that names both).

## Same producer, two other lives

- Fresno: the finalist at the announcement is the same cast (runner-up from the reasons) at the venue; the `ask` stance ("what would have made the difference") is his question.
- Dayton: the passed-over insider who retires is the same trigger with a different ending, an `until-they-decide` close; the producer reads the reply, not a fixed outcome.

## Gaps

The trigger record names the appointer (engine item above); an acting-head record and a passed-over record are absent; "wanted" cannot be said. The cast, place and lines exist.
