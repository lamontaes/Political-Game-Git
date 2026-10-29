# Episode: the first day in a new public job (who shows you the ropes)

Slug `first-day-at-the-new-job`. Season: holding office. Types: `first-day`. Calibration only: nothing here ships as player text; no real name or quoted line is in any bank.

## Sources read (for calibration)

Opened in full (fetched and read):

1. Lawrence Journal-World, Jan. 4, 2007, a freshman U.S. representative's day before the swearing-in (https://www2.ljworld.com/news/2007/jan/04/doors_opening_boyda/). A neighbor member from the same state stopped by to ask "All moved in?"; the chief of staff made sure she could reach the caucus alone; the first staff meeting was a five-minute conference call; caucus leaders said they would take no amendments on the early bills; she was asked to handle a constituent who had not heard her predecessor lost ("Do whatever you need to do to not make that person feel awkward"); she was still looking for an apartment.
2. Everett Herald (HeraldNet), Jan. 9, 2026, Lake Stevens council's first meeting of the year (https://www.heraldnet.com/news/lake-stevens-new-city-council-meets-for-the-first-time). City staff swore in four members; members volunteered for boards and committees and the council voted where two wanted the same seat; one new member won a utility committee seat 5-2 against the mayor's wishes, who questioned his impartiality over campaign donations. The article names no one who guided the newcomers.
3. WDIO, Jan. 5, 2026, Duluth swearing-in (https://www.wdio.com/?p=717252). The mayor, a former councilor, told new members to "turn to your more veteran counselors," said veterans want newcomers to succeed even across political lines, and described one-on-one time as how he built relationships.
4. Roll Call, Jan. 3, 2013, new-member orientation (https://rollcall.com/2013/01/03/orientation-and-office-space-set-the-tone-for-the-first-term-of-a-member/). Procedure, protocol, committee posts and a room draw; a chief of staff called the job "starting a small business from the ground up."
5. Juneau Independent, July 1, 2025, a new city clerk's first day (https://www.juneauindependent.com/post/a-final-blur-of-a-day-for-beth-mcewen-after-28-years-at-cbj-before-breckan-hendricks-takes-over-as). Opened; she sat at the chief clerk's desk, "familiarizing myself with this office and with all my resources." It says nothing about who taught her or what she was told.

Search summaries only (not opened): a city governing-body manual from Derby, Kansas (https://derbyks.gov/DocumentCenter/View/1593/Governing-Body-Manual), which says new members are surprised by limits on their role and by the time involved; Live Oak, Calif. (via a search summary), where a new councilman said residents had "a list" and the phone "has already started ringing"; Niles (Mich.) clerk handoff (https://www.leaderpub.com/?p=856673), a retiring clerk trained her successor from October to January (the page was refused, 429).

## Fact packet (what happens, in substance)

- **Who and why:** the newcomer, a person who has been there longer (chief of staff, clerk, a veteran member, the predecessor), and the people already in the room.
- **Trigger:** the first day: oath or keys, a desk, a first meeting.
- **The guide:** is a neighbor, a staffer or a veteran, not the boss. They check small things first ("all moved in?"), then say what the newcomer will not be allowed to change.
- **What the newcomer is told about how it really works:** early votes are already set; committee seats go to whoever asks and can count votes; constituents will call with their own list; turn to the veterans; the role has limits.
- **What the newcomer asks:** who had this job before, what to avoid, what a normal day is.
- **What the newcomer fears:** being overwhelmed, looking lost in front of staff, being given the work nobody wants.
- **Choice:** accept the guide's way, volunteer for the hard seat and risk the mayor, or ask around other people.
- **First act on the record:** volunteer for a committee; handle a constituent kindly.
- **What changes after:** the newcomer owes the guide, or has crossed someone; a seat or duty is on record; a veteran is now the one they call.

## Ask the engine

| Packet line                                     | Record and type                                                                                                                                 | Status                             |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| First day at a job                              | job record, e.g. `job:position:organization_048cfc00dca25fa6:2025-12-01:111:person_0289566afe5c1a52`; `first-day` fired once in the played year | exists, fires                      |
| Guide is a veteran or staffer                   | `authority` fills from `coworkers`; no pick by seniority or tie to the office                                                                   | exists, nothing fires on seniority |
| Seat/office oath, keys, meeting                 | taking office is not the `money:job-started` cause the type uses; no record seen that stands for it                                             | no record                          |
| Predecessor ("who had this job before")         | prior job holder on the position record                                                                                                         | exists, nothing fires              |
| Told early votes are set, or limits of the role | council agenda and votes exist in the law engines; no record of "what the newcomer was told"                                                    | no record                          |
| Committee seat by volunteering, vote            | committee assignments for a body                                                                                                                | no record seen                     |
| Constituent calls with a list                   | constituent contacts exist elsewhere in the director; none tied to day one                                                                      | exists, nothing fires              |
| Owing the guide later                           | `scene.reply` records exist                                                                                                                     | exists, nothing fires              |

## Gaps

1. Elected and appointed office: `first-day` has no cause for taking a seat or an appointment. Producer (lead director), with the elections engine for the oath record.
2. Guide casting: `coworkers` ignores tenure and role. Producer (lead director): pick the longest-serving person at the same place, or the predecessor.
3. Content: no engine record says which votes are already set or which seats are open. Engine (laws/ordinances engine), so the guide's warning is true when said.
4. Lines: the bank has about 100 `first-day-ropes` pieces for a workplace (keys, a mug, "nobody lasts a year"), none for a chamber, a clerk's counter or a staff office. Lines (words lead).
5. Constituent first-day calls are not tied to the office. Producer (lead director).
6. The result (a debt to the guide, a committee seat) writes nothing. Engine (relationships, effects).

## Lines the bank needs (substance only)

Speaker: the guide, by trait and tie (neighbor, chief of staff, clerk, predecessor, veteran of the other party).

- Guarded: says what will not change and warns about early votes.
- Warm: asks "all moved in?" and offers the unwritten map (who to call, who answers).
- Blunt: names the work that always lands on the newest.
- Newcomer's four stances: take the hard job, ask who held it before, ask what everyone avoids, say "I'll ask around."
- A line for the office desk: the first constituent, a person who has not heard the result.

## Other lives the same scene covers

- A new city clerk whose first day is a quiet morning at the chief's desk, learning her resources (source 5).
- A freshman state or city member told by the mayor to turn to veterans across party lines (source 3).
