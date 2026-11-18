---
id: gov-statewide-commission-seats-not-read
title: "A statewide commission with five members on the record is built as one seat"
area: gov
kind: bug
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
standard: 2
model: opus
effort: medium
lead: governing
root: none
source: Account lead, Nov 15, found while moving the notes out of office names
claimed-at:
after:
checked:
---

**What.** The research record says the Corporation Commission of Arizona has 5 members elected in staggered 4-year terms, and the Public Service Commission of Georgia has 5, but the game builds each as an office of one seat. Feeds: gov-board-seats-that-are-separate-offices. Seen: Politics, Local, State, the commission's page.

**Cause.** Needs cause. Read first: `stateOffices` in src/core2/offices-state.ts sets `seats: 1` and one seat row for every entry of `executives`, though the entry holds `seats` and `staggered`; whether elections, filing and the ballot can take a multi-seat statewide office is not read.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one session to find the cause and write it here. When it runs out, write what was read and stop.

**Rules.** One engine per mechanic; the seats come from the record's own `seats`.

**Done when.** A second session, in a played world at a place and seed nobody chose, sees the commission with its members on the Politics tab and in the filing lines.

**Waits on.** Nothing.

**Files.** src/core2/offices-state.ts, data/research/offices/state-offices.json
