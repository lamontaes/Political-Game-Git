---
id: screens-vote-rows-one-size-and-cue
title: "Government's recent votes: one type size, a cue at rest and a hover light on rows that open"
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

**What.** The owner, Nov 23 (P22), said: I can click on the recent votes, but it gives me no highlight thing or anything to indicate that it is a hyperlink. The CTO caught (C7) that the third row is in a bigger font than the first two. The openable rows are drawn smaller than the others and have no cue.
Seen: Politics, Government, Recent votes at 1440 by 900. Seen: Government, Recent votes, hovering a row, after. Guards: vote-rows-look.browser.mjs

**Cause.** Measured: `node src/bench/vote-rows-look.browser.mjs (new)` against `npm run bench` on main 2b7b3b28, three drawn places (Ellenboro, West Virginia; Lajas, Puerto Rico; Tanana, Alaska), fails "the vote rows differ in type: 14px,17px". voteRows in src/bench/ui/strips.mjs gives an openable row the class pick, so the .pick span rule in src/bench/play.css (about line 5509) sets its label, leader and value to 14px, and the hover rule is scoped to .pick-list, so a row has no cue.

**Fix.** Give an openable vote row its own class open-row (strips.mjs), with a brighter name at rest and the shared hover light in play.css; update the two checks that selected .vote-rows .pick; add vote-rows-look.browser.mjs.

**Time box.** 1 hours

**Rules.** Screen to mock: MENU-LOOK States say a clickable row has a cue at rest and hover confirms. No hand-written player text: no new label is added; the row words are untouched.

**Done when.** A second session, in a drawn place and seed it names, opens Politics, Government and sees every recent-vote row in one type size, an openable row with a brighter name, and a lit row on hover; vote-rows-look.browser.mjs passes.

**Waits on.** Nothing

**Files.** src/bench/ui/strips.mjs,src/bench/play.css,src/bench/vote-rows-look.browser.mjs (new),src/bench/states.browser.mjs,src/bench/no-back-no-caption.browser.mjs
