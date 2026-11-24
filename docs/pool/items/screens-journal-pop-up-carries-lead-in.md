---
id: screens-journal-pop-up-carries-lead-in
title: "A Journal pop-up that follows another line carries the line it follows"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** The owner Nov 23 (P20) said: this strip at the bottom that says here, and then it says 2 years after that. What is this random stuff popping up? The pop-up at the bottom right shows only the newest Journal line, so a line like "Two years after that, my son Jose was born." appears with nothing before it.
Seen: the Journal pop-up at the bottom right of the room at 1440 by 900. Seen: the Journal pop-up bottom right with two sentences, after. Guards: journal-pop-up-lead-in.browser.mjs

**Cause.** Measured: `node src/bench/journal-pop-up-lead-in.browser.mjs` against `npm run bench` on main 2b7b3b28 fails "the pop-up shows the line alone". renderJournalNote in src/bench/play.mjs sets the pop-up to chapters.at(-1).lines.at(-1).text and ignores the line link.earlierId that the Journal record keeps for the line it follows.

**Fix.** In renderJournalNote prefix the line named by link.earlierId (found among the chapters lines) to the newest line; the words stay the Journal bank. Add journal-pop-up-lead-in.browser.mjs. The HERE strip is the room people label from controls.here and is unchanged; the line itself is the Words lane.

**Time box.** 1 hours

**Rules.** No hand-written player text: both sentences are the Journal own lines. Screen to mock.

**Done when.** A second session, in a drawn place and seed it names, sees the Journal pop-up carry the earlier line before a line that links to it; journal-pop-up-lead-in.browser.mjs passes.

**Waits on.** Nothing

**Files.** src/bench/play.mjs,src/bench/journal-pop-up-lead-in.browser.mjs
