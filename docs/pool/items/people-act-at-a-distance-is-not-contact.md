---
id: people-act-at-a-distance-is-not-contact
title: 'An act made apart (a veto, an answer to the whip, a promise settled by a roll call, a bribe left unrewarded) is recorded as time spent together, so the next greeting says "I saw you yesterday"'
area: people
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-hkqdh2-veto-remembered
pr: "#9489"
after:
blocked-on:
model: opus
effort: medium
root: none
lead: effects
source: desk thread, played file for desk item 5 (Nov 15, 2026)
---

**What.** Some acts change how two people feel about each other without them being together: a mayor's or governor's veto of a member's bill, a member's answer to the whip, a promise settled by the roll call or payment it named, and a bribe the official took and then did not reward. Each is written through the one relationship writer, which recorded it as time the two spent together that day. The next day the sponsor of a vetoed bill greeted the mayor with "You again. I saw you yesterday." though the two never met. Played at sha 8ee50dd0 in Havre, Montana (3035050) and Elk River, Idaho (1625120), seed 4276344481a2b078e70633cfee47d0caccb65f74:2 and :4: all six talks the day after a veto opened on a seen-you-yesterday line.
Seen: the sponsor's greeting the day after a veto.

**Cause.** Found in code: the `relationship` writer in src/core2/state.ts (function `relationship`) set `row.lastContactDate = at` for every change, whatever its reason, so an act made apart was recorded as time spent together. `lastContact` in src/director/relation-facts.ts (line 32) reads that date as the day the two were last together; the greeting's seen-recently lines, the director's ties (src/director/ledger.ts) and the person card (src/bench/card.ts) read it the same way.

**Fix.** The writer's reason says `apart: true` for a change made apart. The level moves and fades as before, re-based to today; the day the two were last together is kept beside it (`lastMetDate`, null when they never met) and read through `lastTogether` (src/core2/closeness.ts) by the greeting, the director's ties, the scheduler and the person card. The four acts made apart pass it: `decideDesk` (src/core2/modules/office-day.ts), the whip answer (src/core2/office-day-federal.ts), a promise settled (src/director/promises.ts) and a bribe unrewarded (src/core2/modules/corruption.ts). No new table and no second writer.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: the one relationship writer, not a second tie store. No dice. Speed: no scan of ties; the change is on the one row written.

**Done when.** A second session in a drawn place with a mayor who has a veto (dev mode's bill controls) vetoes a council member's bill, advances a day and opens a talk with the sponsor: the greeting does not say they met yesterday, and the tie's closeness still shows the veto's step. A member of Congress who answers the whip and meets the whip the next day is not greeted as seen yesterday.

**Waits on.** Nothing.

**Files.** src/core2/state.ts, src/core2/types.ts, src/core2/closeness.ts, src/core2/modules/office-day.ts, src/core2/office-day-federal.ts, src/core2/modules/corruption.ts, src/director/promises.ts, src/director/relation-facts.ts, src/director/ledger.ts, src/director/scheduling.ts, src/bench/card.ts

**Notes.** Found by the desk thread's played file for item 5 (the veto said at the next talk); fixed in #9489. Every call of the relationship writer was read (52 on the branch at 59945197): the four above are made apart. The rest are time together: talks, scenes and their replies and endings (conversation.ts, purpose-scene.ts, a promise answered in a talk), visits, care, home time and kin contact, meetings and hearings, interviews and a source's tip, staff hired and an hour with a department head, campaign doors, party gatherings, a member asked in person or a deal struck, a lobbyist's meeting, a resident's case brought in person, mentorship, a rescue, a quarrel, a bribe paid in person, a cabinet nomination, the opening family and drives' acts toward a person.
