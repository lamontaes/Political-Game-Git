---
id: director-donor-ask-offer-sets-a-real-meeting
title: "Taking a donor's meeting offer puts a real meeting on the calendar that then happens"
area: director
kind: feature
priority: 2
size: S
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
source: "Words lead's ruling on #9205, Nov 14, 2026, 17:20Z: the four meeting offers come out until taking one sets a real meeting; filed by F5"
checked:
---

**What.** In a donor's ask the candidate can answer with an offer to meet (bring people from the donor's employer by the office, set a meeting, hear from the employer directly, have someone call the office). The offers were taken out of #9205 because the ending they reach, `process`, keeps `meeting-set`, which only the Journal reads as a story entry: no meeting is set and none happens. A player who offers a meeting is left with a Journal line and nothing on the calendar. Once the meeting exists, the four offer lines come back from `/mnt/project-files/words-lead/8792-carry/` (their keys are in #9205's history). Seen: on the player's calendar and in the Journal after the offer is taken.

**Cause.** Found in code: the donor-ask arc's `process` ending (`src/director/data/purpose-arcs.json`) keeps `meeting-set`, whose only reader is the Journal (`src/director/journal.ts`, `scene-ending:meeting-set` in `src/director/data/journal-rows.json`); nothing records a meeting or a day. The record that holds "we agreed to do something by a day" is the promise on the kept fact (#9192, head 6d4a6a3a: `src/director/promises.ts` `promiseOfEvent` gives it `dueOn` from the kind's window; `src/director/data/promise-kinds.json` lists the kinds and their `endings`). The existing kind `show-around` is the shape: settled by `pair-talk` (a talk between the two, the conversation engine's `conversation` cause in `settlePromisesOnTie`), kept when they talk, broken when the window closes with none; a promise ending cools or warms the tie through `endPromise` and the one owed says it at the next talk (`src/director/promise-talk.ts`). There is no calendar row to build: the promise's `dueOn` is the day, and the talk the two have is the meeting.

**Fix.** After #9192 folds: add a kind `meet-donor` to `promise-kinds.json` (settle operation `pair-talk`, a window parameter tagged TUNABLE with its spread, `windowEnds: "broken"`, like `show-around`) and one `endings` row `{purpose: "donor-ask", ending: "process", kind: "meet-donor"}`, so the arc's offer reply writes the promise and the donor's talk with the candidate within the window keeps it (a closer tie) and none breaks it (a cooler one, and the donor says so at the next talk). Then put the four offer lines back (keys in #9205's history, under `/mnt/project-files/words-lead/8792-carry/`), reworded as the Words lead rules. No second way to stage a later scene.

**Time box.** 2 hours for one session after #9192 folds.

**Rules.** One engine per mechanic: the meeting is a record an existing engine keeps and another reads, never a second calendar. No dice: who comes and what they say follow from the donor's employer and the bill, by record.

**Done when.** A second session plays a campaign in a drawn place, named with its seed, takes a donor's meeting offer, and finds the promise to meet in the Journal with its day; talks to the donor before that day and sees the tie warm and the promise kept; in a second life lets the day pass without a talk and sees the donor say at the next talk that the meeting never happened and the tie cool. Seen: the player's calendar and the Journal after the offer is taken.

**Waits on.** #9205 and #9192 folded.

**Files.** src/director/data/promise-kinds.json (new), src/director/promises.ts (new), data/english/parts/scene-talk.json
