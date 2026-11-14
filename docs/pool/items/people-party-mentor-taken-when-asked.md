---
id: people-party-mentor-taken-when-asked
title: "When a party asks a member to run, one of its seasoned officeholders takes them under their wing, and the advice scene reads that tie"
area: people
kind: stopgap
priority: 2
size: S
status: in-pr
claimed-by: claude/project-thread-86yqt4
pr: "#9258"
blocked-on:
source: stopgap plan cluster 29 part 3 (Nov 14, 2026); Account lead, Nov 14
claimed-at: 2026-11-14T13:45:00Z
after: lives-civic-roles-read-from-party-records
lead: elections
standard: 2
model: opus
effort: medium
root: none
checked: account lead 2026-11-14
---

**What.** The day after a party asks the player to run, an officeholder of that party weighs in (the advice scene, `mentor-weighs-in`). Nothing recorded a mentorship, so the director picked any seated officeholder of the party in town (SG-WORDS-mentor-is-officeholder). Seen: who comes to give advice after the ask, and whether that person knows the player afterwards.

**Cause.** Found in code: `partyOfficeholders` in `src/director/circumstance.ts` chose the adviser from serving terms and party ties at the moment of the scene; `src/core2/modules/mentorship.ts` only paired workplace hires (`work.mentorship-formed`), so no engine wrote a mentor for a party newcomer.

**Fix.** The parties module keeps a `mentors` table. When the candidacy engine records a party's ask, `takeUnderWing` pairs the asked member with the party's seated officeholder in town who has held a seat a year or more and is closest to them (then the longest seated), writes the row, a first contact between them and a `party.mentorship-formed` record. The advice scene's cast reads that row (`party-mentor` pool, `partyMentorOf`). The director's guess and its stopgap row are deleted.

**Time box.** 3 hours for one opus session.

**Rules.** No dice; one rule, all 56 places; one engine per mechanic (the candidacy engine that makes the ask writes the pairing; the advice scene reads it).

**Done when.** A second session, in a drawn place, plays to a party's ask of the player where the party holds a seat in town, and sees the next day's advice come from the officeholder named in the party's mentors record, who is now among the player's contacts.

**Waits on.** Nothing.

**Files.** src/core2/modules/parties.ts, src/core2/modules/candidacy.ts, src/director/circumstance.ts, src/director/data/circumstances.json, src/director/data/stopgaps.json

**Notes.**
