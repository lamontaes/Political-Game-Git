---
id: play-ballot-stays-live-after-the-visit-ends
title: 'A finished ballot kept live race buttons, so a later click raised "The polls aren''t open for this character."'
area: play
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
claimed-by: T56
pr: 9208
after:
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: none
source: "Account lead T56, Nov 14, 2026, from the Journal builder's six-month replay at New Haven, Vermont (/mnt/project-files/words-lead/journal/polls-error-repro.md)"
checked:
claimed-at:
---

**What.** After the player votes, the page's ballot stays in the document with every race button still live, only hidden. A click on one (a script or a replay that clicks what it finds) posts a mark to polls that are closed, and the page logs "The polls aren't open for this character.

Seen: on the election-day ballot panel of the page, in the replay at New Haven, Vermont (bench place key 5048550, seed c9053b03e98d459361bb0fc1feab0c7eaaa5f1ad789861d85de6bc69a18ad2f8) logged 40 marks after the March 4 vote, the first two real and the rest against a visit that was over.

**Cause.** Found in code: the finish function of atThePolls in src/bench/play.mjs (line 1370) ended with show("ballot", false) and never emptied the ballot paper, and its mark and leave handlers let a failed post escape as an uncaught page error.

**Fix.** Design: the ballot paper goes when the visit ends (finish empties the panel), and a mark or leave that fails because the visit is over closes the ballot instead of raising. One engine: the handler already refuses a mark with no visit; only the page stops offering one.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** Replace, never layer; no new route and no new state.

**Done when.** A second session plays a drawn place to election day, votes, and finds no ballot race button left in the page and no "polls aren't open" error in the page's error list on later Day presses; src/bench/polling.browser.mjs pins it (it fails with the old page and passes with the new one).

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/polling.browser.mjs

**Notes.** Built by T56 on the Account lead's fault report.
