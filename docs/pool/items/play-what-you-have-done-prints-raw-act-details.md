---
id: play-what-you-have-done-prints-raw-act-details
title: 'Your office → What you have done prints each act''s stored detail as it is: "1 hours", and for other acts record ids, ISO dates and raw keys'
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
after:
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: none
checked: fable
source: Playtester P2, Nov 13 (Donnelly, Idaho, seed 879aec36-14a1-4697-96f8-a791162c7879)
---

**What.** On main 596d5127, an Advanced start in Donnelly, Idaho (seed 879aec36-14a1-4697-96f8-a791162c7879) as Council member Alex Hughes, a year in. Politics → Your office → What you have done shows "JANUARY 8, 2026 · MEET / 1 hours". Other lives show "yes · Decided for me" and "yes" beside a vote, with no bill named. The row's right side is the act record's `detail` string, and for several acts that string is built for the engine, not for a reader. Seen: each act on What you have done is said in words: what was done, with whom or on what, never an id, an ISO date or a key.

**Cause.** Found in code: the office acts list (`src/bench/play.mjs`, line 2750) prints `a.detail` straight from `officeActsOf`. The details are written in `src/core2/office-day-acts.ts` and `src/core2/modules/office-day.ts` as engine text: `${hours} hours` (line 850, "1 hours"), `${outlet.id}: ${done.status}` (line 620, an outlet's id), `${due.governmentId} budget for the year starting ${due.fiscalYearStarts}` (line 784, an id and an ISO date), `JSON.stringify(itemIndices)` (office-day.ts line 900), `ribbon.projectId` (line 805), `${topic.desiredChange} ${topic.question}` (line 713, raw keys), `declined: ${asked.reason ?? "no reason"}`, and "for", "against", "sign", "veto".

**Fix.** The act record keeps its facts as fields (hours, outlet id, government id and date, item indices, project id, question, position), and the screen says them: the kind's control name, the person's or outlet's or government's name read from its record, dates through `dateWords`, a count with its singular or plural word, a vote's bill by number and name. The engine's `detail` stays for the Trace only. A test reads every act kind `officeActsOf` can return and checks that the screen's line for it holds no id, no ISO date and no key.

**Time box.** 2 hours

**Rules.** No hand-written player text: every word comes from control names or the bank, through `player-screen-text`. One rule, all 56 places: every act kind is said the same way for every office.

**Done when.** The new test passes, and a second session sees, on the bench on main, a drawn Advanced start as a council member a few months in, with every row on What you have done in words (screenshot with the place and seed).

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/office.ts, src/core2/office-day-acts.ts, src/core2/modules/office-day.ts, src/bench/data/controls.json

**Notes.** Words in controls.json need Fable A's review (Review: words).
