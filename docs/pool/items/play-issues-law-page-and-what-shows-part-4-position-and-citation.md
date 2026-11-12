---
id: play-issues-law-page-and-what-shows-part-4-position-and-citation
title: "The player chooses a position on a law and its citation opens the game's own display"
area: play
kind: feature
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after: play-issues-law-page-and-what-shows-part-2-law-page-summary
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: rc7-player-cannot-drive
milestone: play-first
source: split from play-issues-law-page-and-what-shows in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Two things on a law's page. First, a control to choose the player's position on the law (the owner: "You could choose your position"), kept as the player's stance and read by the campaign and the journal. Second, the citation: a law's page prints a bare statute row such as "STATUTE 19 U.S.C. 1862" with nothing to click, which the owner's bill ruling forbids ("Citations open the game's own display of that law, never a web page"). The citation opens the game's own display of that law, or is not shown. Seen: a law's page, where the player chooses a position and a citation opens the game's own law display.

**Cause.** Found in code: `lawPage` in src/bench/play.mjs builds the statute row as `row(labels.statute, l.row.terms.cite)` (lines 5068 to 5070) and puts it in the In force section (line 5113) as plain text; the label is `politics.statute` in src/bench/data/controls.json; no position control exists on the page.

**Fix.** Make the statute row a link that opens the game's own display of that law (the law's page, or the bill that enacted it), never a web page; add a position control (support, oppose, undecided) that writes the player's stance through the views module and shows on the page; delete the bare statute row. Starting laws keep their citation and enactment date (the Oct 27 ruling: only real statistics are stripped); laws passed in play show their own in-game date.

**Time box.** 4 hours for one Sonnet session; if not done, push what exists, open the draft PR, write the handoff.

**Rules.** Replace, never layer: the bare statute row is replaced by the link. Wire to the world: the player's position is a stance record another engine reads (the campaign screen or the journal), named by record id. No hand-written player text. One rule, all 56 places: citations are read from the law row's data, no place named.

**Done when.** A second session, in a drawn place (named with its seed), opens a law's page, clicks its citation and lands on the game's own display of that law, chooses a position and finds it kept (stance record id) and shown on the page after reopening; no row on any law page is a bare citation with nothing to click, shown by a screenshot at 1440x900.

**Waits on.** Nothing. Part 2 should land first so the page has its layout.

**Files.** src/bench/play.mjs, src/bench/data/controls.json, src/bench/government.ts, src/core2/modules/views.ts

**You will see.** A law's page lets you choose your position, and its citation opens the game's own display of the law.

**Screenshot.** One law's page with a position chosen and the citation open.
