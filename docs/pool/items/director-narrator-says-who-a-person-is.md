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

**Fix.** One reader, src/director/who-they-are.ts whatTheyAre, returns a kind, stage and slots from the records (office held or appointed post, an official's aide, a tie on record, a constituent of the player's seat, a workplace), the first that holds and has a line, and nothing for someone the met record holds or family. A line that a played scene never said is left out, and a read with no line passes to the next kind. The said-as reader words it from data/english/said-as.json whatTheyAre (the Words lead's lines), set off by commas after the first full name; saidPersonOf, scene.ts who() and the arrival take it. A line that sets the name off itself ("{name}, the police chief,") says the bare name, and so does a possessive ("{name}'s name").

**Time box.** 4 hours, one Opus session at medium effort.

**Rules.** One rule, all 56 places and every level: offices, posts and bodies are rows. No hand-written player text in code. Wire to the world: every slot is a record.

**Done when.** At a pinned place the swearing-in says the clerk as "the city clerk" after the full name once, a person who is two things on record is said by the one that matters in the scene, family and people met get nothing; a played file shows the swearing-in at a council, mayor and state seat and office hours at two towns; a second session sees it in a new life.

**Waits on.** #9489 (the met record it reads).

**Not reached in play, wording left out (lead and Words lead, Nov 15).** A sweep capped at one hour (.probe/who-kinds.mts; /mnt/project-files/words-lead/who-they-are/who-kinds-a8be8346.md and who-kinds-eadba314.md: Hardinsburg KY, Thompsonville IL, Hurley SD and Revere MO, 180 to 430 days, the player and every officeholder and aide watched) composed every scheduled scene. It said office, staff, schoolmate, the player's campaign, "whose bill you signed", constituent and "who works at". These never played, so their lines are out of said-as.json and stay in lines.md:

- presides ("who chairs {body}"): every presiding officer on record has a title of its own or no officials row, so it is said by office. The reader branch was deleted.
- seat-holder, outgoing ("who held this seat until today"): the outgoing holder is cast only as the oath giver where no clerk is found, which no drawn place had. Holding ("who holds the seat you are running for"): the holder holds an office, which is said first, so this could never be said. The reader was deleted.
- resident of another place ("from {place}"): no scene cast someone from elsewhere whom the player had not met. The reader was deleted.
- workplace, with you ("who works with you at {employer}"): the player's unmet coworkers were never cast.
- acts: vetoed, unsigned, appointed, and signed with the player's bill. A line is added back with the first played scene that says it.

**Files.** src/director/who-they-are.ts, src/english/said-as.ts, data/english/said-as.json, src/director/said-person.ts, src/director/scene.ts, src/director/purpose-scene.ts, src/english/grounded-english.ts
