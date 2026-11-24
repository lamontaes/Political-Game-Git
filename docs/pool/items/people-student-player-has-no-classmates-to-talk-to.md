---
id: people-student-player-has-no-classmates-to-talk-to
title: "A student player has no classmate outside the family to meet, and classmates have nothing to say about the school they share now"
area: people
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Found building the shared-school talk fix (Nov 15), Train b22cd350
---

**What.** A 17-year-old player starts the game enrolled at the town's public schools and has no classmate outside the family to meet or talk to. Talk has nothing to say about a school two people attend now. Two systems are missing. (1) Classmates and the school are not a present-day tie or subject. The shared-school subject is only a memory: every school ask needs the fact `long-ago` (20 or more years since), so two people at the same school today have no line about it. Talk between kin has no shared-school subject at all. (2) A student player has no way to meet classmates. School is not a place on the Travel menu, students are not staff anywhere the player can go, and the opening gives the player no classmate in their circle. Seen: a student player's home screen and Travel menu offer no classmate, and a talk with a sibling at the same school says nothing about it.

**Cause.** Measured: with a new life at seed 7952d3f3e3253ee4 (Dortches, North Carolina), the default player born Jan 28, 2007. Of 84 full people the school records (`sharedHistory`, src/core2/shared-history.ts) name as the player's schoolmates, the only ones still enrolled with the player are two siblings. Among the player's `knownIds` there are 0 non-kin enrolled schoolmates, and none works at a place `/api/goto` lists. A talk opened at home with the sibling born Jan 10, 2012 on Jan 21 has no line. `subjectsBetween` gives that pair no shared-school subject, only address and quiet. Non-kin pairs still enrolled together are on record, for example Michael (person_15786a67c3834faf) and Bryan (person_1a2895e069f8fc4f). Their shared-school subject holds only the school's name: no years and no long-ago, so no ask in data/english/parts/conversation.json can play. The opening peer network that would have put classmates in the circle was dropped (core-opening-peer-network-openingPeerGroupSize-as-cause). Ties grown from hours at school are in people-shared-time-grows-ties (in PR), and it does not cover meeting or talk.

**Fix.** Not yet chosen; for the lead. Build it as the school engine's present-day view, not a second engine. (a) Classmates enrolled together are a tie and a subject now: what is going on at school, read from the school engine's records. The words go to Story to write. (b) A student player meets classmates on the school's own path, from the school day the schedule already keeps (`school-missed`, `school-day`). That could be a school place on Travel during school hours, or classmates in the opening circle from the school records. Look first for the owner's rulings on school as a place and on the player's circle at 18.

**Time box.** 4 hours for one Opus session at medium effort for the first slice, (a) at home and in town.

**Rules.** One rule, all 56 places: classmates come from each place's school records. Day one in motion: a student player opens with classmates already in their circle. No dice.

**Done when.** A second session, on main, starts a new life as a student in a played world at seed 7952d3f3e3253ee4 (Dortches, North Carolina) and in a place drawn from all 56. It meets a classmate outside the family through the screens a player reaches, and the classmate says something about the school they attend now, read from the school's records.

**Waits on.** Nothing.

**Files.** src/core2/shared-history.ts; src/director/conversation.ts; src/bench/places.ts; data/english/parts/conversation.json

**Notes.** Nov 15: filed by the "Let people bring up election results" thread at the Account lead's direction.
