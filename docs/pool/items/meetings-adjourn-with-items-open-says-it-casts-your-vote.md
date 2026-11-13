---
id: meetings-adjourn-with-items-open-says-it-casts-your-vote
title: "Pressing Adjourn with items still open casts your own position on each, and the meeting panel says so before and shows it afterward"
area: gov
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: gov-held-meeting-decides-as-unheld
blocked-on:
lead: governing
model: opus
effort: medium
root: none
source: found while building gov-held-meeting-decides-as-unheld (Account lead T22, Nov 13); filed by hand on the branch
---

**What.** At a council or board meeting the player sits on, pressing Adjourn with items still open hands each open item to the player's character, which casts the member's own position on it (the same cast as Decide for me; recorded as an own-choice act dated the meeting day). Nothing on the meeting panel tells the player this before the press, and the panel closes on the press, so the player does not see the votes cast as theirs. Seen: the meeting panel's Adjourn button and the roll call on each item afterward.

**Cause.** Found in code: `adjourn` in src/core2/modules/office-day.ts wraps the items left in `leavingToCharacter`, so `ownVote` casts for the player; the panel's Adjourn button (src/bench/play.mjs, `meeting-adjourn`) posts to /api/meeting/adjourn and calls `finish()` with no line before or after. This was the behavior on main before pull request #9051; #9051 makes the committee-board case match the rest and changes no wording. Whether this is inside the CTO's 04:18Z ruling on Decide for me (abstaining only for a player who does not act) is asked on #8928.

**Fix.** Keep the cast. Before the press, the Adjourn control carries a line that says the open items are voted on the player's own position; after it, the panel or the Journal shows each cast vote as the player's own, from the act records already kept (`acts`, how `own-choice`). All wording goes through the English engine's banks and Fable A, never typed into a screen. No new engine: the line reads the open item count the panel already has and the acts the module already keeps. If the CTO rules that Adjourn must leave open items unvoted, this item becomes a one-line change in `adjourn` plus the twin test's adjourn assertions in src/core2/office-day-attend.test.ts.

**Time box.** 2 hours

**Rules.** No hand-written player text in code (scene-standard). Screens follow the mocks and shared controls. Words bar: before and after screens in three drawn places and Fable A's read.

**Done when.** A second session sees it in the running game: in a drawn place and seed, a player seated on a board opens a meeting with items open, reads the line before pressing Adjourn, presses it, and finds each open item's vote shown as their own, with the same votes in dev mode's bill outcome.

**Waits on.** gov-held-meeting-decides-as-unheld

**Files.** src/bench/play.mjs, src/bench/office.ts, data/english/parts/meeting.json (Words session), src/core2/office-day-attend.test.ts
