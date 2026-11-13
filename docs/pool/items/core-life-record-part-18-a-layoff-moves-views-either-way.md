---
id: core-life-record-part-18-a-layoff-moves-views-either-way
title: "The life record, part 18: a person's own layoff moves their view left or right, by their traits"
area: people
kind: feature
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: opus-lr
pr: #8992
after: core-life-record-part-14-a-past-that-moves-views
blocked-on:
lead: lives
model: opus
effort: medium
root: design-life-record
source: Fable A's question on #8973, Nov 13, 2026, filed by the Life records builder opus-lr
checked: opus-lr 2026-11-13
---

**What.** The owner, Nov 12: a past event "could have turned you super MAGA, or it could have turned you liberal." Part 14 moved everyone's own layoff to the left. Seen: dev mode's Trace on a laid-off person, whose view moved left or right with the layoff's record.

**Cause.** Found in code: `src/core2/modules/views.ts` `pastViewShifts` gave an own layoff the change `-pastOwnLayoffShift` times the fade, always leftward, with no read of the person's traits (`SG-PEOPLE-past-views-two-events` named it).

**Fix.** The direction is -1 plus `pastOwnLayoffTurnWeight` (1.5, tunable) times the person's lean toward blaming outsiders over leaning on help, from a new row in the shared decision table (`views.own-layoff`: distrust, self-interest and keep-same against help-others, cooperate and change). The average stays leftward, as Margalit (2013) finds; those leaning furthest to blame turn right, as Autor, Dorn, Hanson and Majlesi (2020) find in part. The shift keeps that lean as `blame`.

**Time box.** 2 hours, Opus.

**Rules.** No dice: traits decide the direction. One engine: the views engine's reader and the shared decision table.

**Done when.** A test in three drawn places prints, among adults moved by their own layoff, how many turned right and the mean change, which stays below zero; each shift turns right exactly when its traits lean far enough to blame. A second session, on main in a drawn place it names with its seed, finds a laid-off adult whose view moved right and sees the layoff's record by Trace in dev mode.

**Waits on.** Nothing.

**Files.** src/core2/modules/views.ts, data/content/trait-decisions.json, src/core2/data/views/views.json
