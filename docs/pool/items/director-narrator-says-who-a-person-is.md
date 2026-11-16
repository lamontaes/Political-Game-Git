---
id: director-narrator-says-who-a-person-is
title: "The narrator says who a person is the first time it names someone the player has not met"
area: words
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: desk thread
pr: 9581
after: people-act-at-a-distance-is-not-contact
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Owner, Nov 15 20:34Z and 20:36Z (rule 136 in /mnt/project-files/words-lead/owner-feedback/played-scenes-feedback.md), through the Words lead and the Account lead
---

**What.** A scene names a person the player has never met by name alone ("Jose waits for you to step forward"), so the player has no idea who they are. The owner: "the narrator should give you context... and that goes for not just local. This is an engine-wide thing."
Seen: in the Scenes page's swearing-in sample, the oath giver is named by first name with nothing to say who they are.

**Cause.** Found in code: the said-as reader (src/english/said-as.ts function saidAs, line 116 before this change) says an unmet person's full name and nothing else unless they hold an office with a title word, and scene.ts who() and the arrival's name fact say the full name only; no reader says what a person is to the player from the records.

**Fix.** One reader, src/director/who-they-are.ts whatTheyAre, returns a kind, stage and slots from the records (office held or appointed post, an official's aide, a constituent of the player's seat), the first that holds, and nothing for someone the met record holds or family. The said-as reader words it from data/english/said-as.json whatTheyAre (the Words lead's lines), set off by commas after the first full name; saidPersonOf, scene.ts who() and the arrival take it. A line that sets the name off itself ("{name}, the police chief,") says the bare name, and so does a possessive ("{name}'s name").

**Time box.** 4 hours, one Opus session at medium effort.

**Rules.** One rule, all 56 places and every level: offices, posts and bodies are rows. No hand-written player text in code. Wire to the world: every slot is a record.

**Done when.** At a pinned place the swearing-in says the clerk as "the city clerk" after the full name once, a person who is two things on record is said by the one that matters in the scene, family and people met get nothing; a played file shows the swearing-in at a council, mayor and state seat and office hours at two towns; a second session sees it in a new life.

**Waits on.** Nothing: #9489 (the met record it reads) is on the Train.

**Not said to the player by their own presses, wording left out (lead and Words lead, Nov 16).** Composed is not played. Three play walks pressed what a player presses (scripts/play-walks; logs in /mnt/project-files/words-lead/who-they-are/walks/): a mayor at Wales UT for 120 days (seed 7b3e19a24c5d8f60), a board member at LaPlace IL for 40 days (seed c41d0e7a92b35f18), and a new life at Kendall FL for 30 days (seed 5e2a91c07d4b3f86). They said office, member of a body, an official's aide and a constituent. The played swearing-in and office hours at Hardinsburg KY add the office alone and the district. Everything else is out of said-as.json and its reader, and the lines wait in lines.md:

- tie: schoolmate, the player's own campaign, and every act. A one-hour sweep (.probe/who-kinds.mts; who-kinds-a8be8346.md and who-kinds-eadba314.md) composed schoolmate, campaign and "whose bill you signed" only for officeholders the director watched, never for the player.
- reporter ("a reporter for {outlet}", Words lead, Nov 16): written, but no walk cast a reporter the player had not met.
- workplace: composed only in job offers, whose own line says the employer, so the job offer takes no phrase (said-as.json sceneSaysIt).
- presides, seat-holder, another place: never composed. A presiding officer is said by a title or by office. The holder of a seat holds an office, which is said first. Nobody from another place whom the player had not met was cast.
  Each comes back with the first scene a player reaches that says it.

**Files.** src/director/who-they-are.ts, src/english/said-as.ts, data/english/said-as.json, src/director/said-person.ts, src/director/scene.ts, src/director/purpose-scene.ts, src/english/grounded-english.ts
