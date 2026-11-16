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

**Said to the player by their own presses, and what is not (lead, Words lead and second reader, Nov 16).** Composed is not played. A scene the director composes for an official the script watches, or for a player seated by `seatWinner`, is staging. Six play walks pressed what a player presses at head e36f0269 (scripts/play-walks/official.mjs, Advanced start; logs headed with the sha in /mnt/project-files/words-lead/who-they-are/walks/):

- mayor at Wales UT, 120 days (seed 7b3e19a24c5d8f60): "William Fernandez, a member of the Sanpete County Commission" and "Ivy Gordon, who lives in Wales";
- board member at LaPlace IL, 40 days (seed c41d0e7a92b35f18): "Lisa Edwards, who works for Brian Nichols";
- council members at Jefferson City TN (seed 9a7f3c21e8b04d65) and Elim AK (seed e15c7a3092fb48d6), and a commissioner at Matlacha Isles-Matlacha Shores FL (seed 2d6e8b0f4a1c9357), 59 to 120 days: everyone they met was named alone (met before or nothing on record).

Read by presses: "a member of {body}", "who works for {official}", "who lives in {place}".

Unread rows, kept with the reason (the lead allows this only where the fallback is worse): "the {office}" (a seat held alone or an appointed post) and "who lives in your district". No walk reached them by presses; they show only in the composed swearing-in and office hours (who-played-<sha>.md). The fallback is the bare full name of a stranger ("Shannon Woodward waits for you to step forward" at an oath, "Aria King meets you at the office"), which is the defect the owner reported in rule 136. A pressed walk that reaches a swearing-in or an office-hours visit (scene-office-hours-visit-never-staged-for-player) reads them.

Out of said-as.json and the reader, the lines waiting in the Words lead's lines.md:

- tie: schoolmate, the player's own campaign, and every act. A one-hour sweep composed these only for officeholders the director watched.
- reporter ("a reporter for {outlet}"): no walk cast a reporter the player had not met. The press interview, scandal, interview and debate scenes name the reporter or host alone (sceneSaysIt) until one does.
- workplace: composed only in job offers, whose own next line says the employer (sceneSaysIt).
- presides, seat-holder, another place: never composed.
  Each comes back with the first scene a player reaches that says it.

**Files.** src/director/who-they-are.ts, src/english/said-as.ts, data/english/said-as.json, src/director/said-person.ts, src/director/scene.ts, src/director/purpose-scene.ts, src/english/grounded-english.ts
