---
id: screens-guide-quorum-no-developer-note
title: "The Guide's Quorum entry drops its developer note"
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

**What.** The CTO, Nov 24 (N16-21, send-back), caught that the Guide Quorum entry has a note reading from that body own recorded rules; where no quorum rule has been recorded, the game says so instead of assuming a majority. That is developer text about how the game works, not something a player reads.
Seen: Guide, the Quorum entry, at 1440 by 900. Seen: Guide, Quorum with its definition and no developer note, after. Guards: guide-quorum-note.browser.mjs

**Cause.** Measured: `node src/bench/guide-quorum-note.browser.mjs` against `npm run bench` on main fails "the Quorum entry carries developer text". data/research/glossary/terms.json gives the quorum term a contextNote, which guide-screen.mjs prints under its Here strip.

**Fix.** Remove the contextNote from the quorum entry (nothing new is written); add guide-quorum-note.browser.mjs. About thirty other terms carry a contextNote of the same family (comes from the body own recorded rules); they are listed for Story, not changed here.

**Time box.** 1 hours

**Rules.** Screen to mock: MENU-LOOK says facts only, no explaining line. No hand-written player text: no line is written, one developer note is removed.

**Done when.** A second session, in a drawn place and seed it names, opens the Guide, selects Quorum and sees its definition with no note about recorded rules; guide-quorum-note.browser.mjs passes.

**Waits on.** Nothing

**Files.** data/research/glossary/terms.json,src/bench/guide-quorum-note.browser.mjs (new)
