# Episode: the quiet weeks, and the listener who offers to work

Season: the campaign's middle (May to September of a drawn race). Helper B, Oct 27, for the director lead. Research only: no code. Calibration only: no real name or line ships.

## What the director needs

1. **Trigger.** `speech.heard` (`src/core2/modules/speech.ts`), written each time the candidate speaks, with the listeners on the speech row. Real record from a played world (`buildBenchWorld`, Kanorado, Kansas, draw `quiet:*`, a resident's U.S. Senate filing `filing:contest:seat:US-KS:us-senate:0:2026-11-03:person_10cfb41e518dc9ce`): `speech:person_10cfb41e518dc9ce:2025-11-07:speech:organization_e69498ee05dc2bd0`. The same candidate had 17 `speech.heard` and 34 `campaign-message` records between May and September 2026. Of the 102 schedule entries the director made for them in those five months, 6 were scenes; the rest were journal lines (22 `campaign-stop`, 8 `press-interview`, 186 over the whole race with no situation type at all). The records exist; the pace ranking turns them into journal lines and no type is written for a listener.
2. **Place kind.** The venue the speech record names, after it (a public place); or the campaign office when the listener comes in.
3. **Cast rule.** The listener is one person from the speech's listener rows (`retellingsOf`, the same rows the `audience` fill reads), scored by the candidate's tie to them, their free time and their agreement with the platform; the strongest score is cast, one scene per speech at most. A listener already a volunteer is cast only for a different scene (the veteran who says the others are drifting).
4. **Outcome record.** The reply writes a volunteer-offered record and, on a yes, `enlistVolunteer(api, filingId, personId)` (exists: it adds the person to the campaign's volunteers, which the canvass and turnout read). A volunteer who joins from a scene has a reason on record: the speech id. Readers: the campaign's canvass and turnout (exist); the director for the next scene (a volunteer who came from a speech brings it up). A refusal writes the same record with the answer.
5. **Lines.** Drafted below for the words lead.

## Real episodes (calibration)

- A first-time canvasser who had never worked a campaign joined a bus trip to knock doors after a city councilmember's speech to the group on the bus, and knocked on more than 30 doors. https://nycitynewsservice.com/?p=23014
- A campaign consultant's advice for the off-year summer: volunteers who start the race may not be around to finish it, so hold a volunteer barbecue and recruit replacements. https://engageduniversity.blogs.wesleyan.edu/?p=14323 (reported by search, verify before citing in a report).
- A Florida school board runoff where candidates barely touched their money after the primary and one took in $450 in the days after; an Alabama Senate campaign wrote that late-summer fundraising slowed and would pick up in September. https://floridapolitics.com/archives/554083-fundraising-lull-settles-in-for-nassau-county-school-board-runoffs ; https://dougforalabama.substack.com/p/september

## The moment

A speech ends and one listener stays behind. They are not a stranger the engine invents: the speech row names them. They say what they heard, say what they can give (evenings, a car, a weekend), and the candidate answers in one of four stances: take them up on it now and give them a job; ask what they can really give; say the campaign is thin on volunteers and name the need; or thank them and keep it light. The summer version is the veteran: a volunteer who has been coming says the others are drifting and asks what the candidate will do about it.

## What the records give today

| Packet line              | Record                            | Fires today                               |
| ------------------------ | --------------------------------- | ----------------------------------------- |
| a speech, with listeners | `speech.heard`, listener rows     | written; no type                          |
| the listener's fit       | ties, free time, agreement score  | computed in `volunteerReason`, not kept   |
| joining                  | `enlistVolunteer`, `volunteerIds` | writes the campaign row only, no record   |
| a volunteer drifting     | none                              | no                                        |
| the pace                 | `ScheduleEntry.outcome`           | 6 scenes of 102 entries, May to September |

## Gaps

- Engine, filed: `campaigns-volunteer-joined-and-lapsed-records` (area elections, lead effects), a record when a volunteer joins (with the speech or ask that brought them) and one when they stop coming, with the reason (free time, the campaign's silence, a better offer).
- Director, filed: `scene-listener-offers-to-work` (lead director), the trigger, place, cast and outcome above.
- Measure for the director's pacing work (not an item): 6 scenes in 102 entries over five months for a filed candidate; the owner's Oct 26 ruling asks that months not be silent for a filed candidate.

## Drafted lines for the words lead (purpose `listener-offers`)

Opening (the listener, by top trait; slots `{speech}` the place or occasion, `{first}`):

- Warm: "That speech at {speech} stayed with me. I want to help, if you'll have me."
- Blunt: "You said what nobody else says. What do you need done?"
- Careful: "I'm not much for politics. But I came to hear you, and I'd like to be useful."
- Veteran: "The old crowd is thin this month. I'll keep coming. Tell me what you're doing about the rest."

Candidate stances: "Come by the office Saturday; I'll find you a route." / "What can you really give? Be honest, it helps me plan." / "We're short of people. I need you, and I need you to bring two more." / "Thank you. I'll keep your name and call when it matters."

Ties: a neighbor says "I've known you since the school board"; a stranger gives only a first name; a rival's former volunteer says so and expects it to matter.
