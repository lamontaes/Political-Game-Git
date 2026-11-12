---
id: scene-office-hours-visit-never-staged-for-player
title: "A resident's visit to the player's office becomes the office-hours scene the day the case opens"
area: words
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: director
model: sonnet
effort: low
root: design-director-on-core2
source: Fable B, Nov 11, 2026, from helper C's bench run (issue #7365, 09:49 UTC); cause found by the cause finder
---

**What.** A played official never gets an office-hours visit on the bench. Helper C started with Advanced, stepped in as a council member in eight drawn places, and played 100 days. In Hudson Falls, New York (seed a2bdef34-c13f-438c-be8b-e4f5883a501f), as Christine Stanton, `/api/office/cases` listed 5 open cases on Feb 19, 2025, and Trace on `office-approached:case:person_117b5845a13fd6d9:2025-02-19` names the player as the official. Yet no resident came with a case: every scene was a street, home, bill or news talk. This blocks "people bring it up" for an officeholder on the golden path. Seen: the office-hours scene, where a resident brings the player their case at the office.

**Cause.** Found in code: the visit reaches the director but loses its place in the queue. `bringCase` in `src/core2/modules/constituent-cases.ts` (line 381) emits `office.approached` naming the official, and the director takes it as a cause moment with the impact `directorFloorVoteImpact`, 0.29 (`src/director/data/director.json`, the `office.approached` row). The `office-hours` situation type matches it for the player (`selfNamed`, `officialId` is the subject; `src/director/data/situation-types.json`, the `office-hours` type). The player is watched: `BenchPlayer.select` in `src/bench/player.ts` (line 80) calls `director.watch` on the person Play as picks. But in `src/director/scheduling.ts` (near line 989) a moment stages its scene at once only if it is in `ownRecordScenes`, `householdScenes` or `metWhereYouAre`, reaches the interrupt impact, or ranks within the adult pace of 4 among the life's moments over the trailing days (`paces.adult`). `cause:event:office.approached` is not in `ownRecordScenes` (`situation-types.json`, scheduling, line 118). For a council member the visit's 0.29 ties with every floor vote and is below a race's or a story's weight, so it rarely ranks in the top 4. It ends as a journal line, while the player's other records fill the pace. The test in #8351 reaches the scene only by calling `director.watch` on every official and `purposeScene` directly, so it never passes through this queue.

**Fix.** In `src/director/data/situation-types.json`, add `"cause:event:office.approached"` to `scheduling.ownRecordScenes`, and add "a resident bringing a case to the official" to that list's description in the scheduling `note`. A visit then stages its scene the day the case opens, at the office (`ownRecordSettings` already holds `office`, and the type's setting is the office), like the other records of the official's own office life. Nothing else changes: the visit still lands only for the official the resident chose, so its rate stays the engine's (residents' problems over time), not the director's. Add a case to `src/director/office-hours-scene.test.ts`: in a drawn place, after Play as a council member and 100 days, at least one `office-hours` scene was staged when the member had a case opened, or the test names the place passed over for having no case.

**Time box.** 1 hour for one Sonnet session.

**Rules.** Scene standard: a scene exists only if it writes something back, and this one already does through its reply (`scene-office-hours-reply-handles-the-case`). No dice: the visit comes from a resident's own recorded problem and their tie to the official, never a rate. One rule, all 56 places: the list is data, with no place named. Review: words, since the change is in director data.

**Done when.** A second session starts the bench with Advanced in a drawn place (named with its seed), uses Play as on a council member, and plays 100 days. When `/api/office/cases` shows a case opened for the player, an office-hours scene with that resident is staged at the office the same day, and its record names the case by `office-approached:case:<person>:<date>`. A screenshot shows it. `src/director/office-hours-scene.test.ts` passes on two fresh seeds.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/director/scheduling.ts, src/core2/modules/constituent-cases.ts, src/bench/player.ts, src/director/office-hours-scene.test.ts
