---
id: screens-people-card-two-columns
title: "A person card on People sets its sections in two columns, so the right half is never empty"
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

**What.** The CTO caught (C17) on the owner Nov 23 playtest that on People the right half of the panel is empty. A person card whose sections all land in one column leaves everything right of that column blank.
Seen: People, the chosen person card at 1440 by 900. Seen: People, a person card in two columns, after. Guards: people-fills-card.browser.mjs

**Cause.** Measured: `node src/bench/people-fills-card.browser.mjs (new)` against `npm run bench` on main 2b7b3b28 fails on four drawn places (Hammett, Idaho: 5 of 8 cards; Egg Harbor City, New Jersey: 14 of 15; St. Maries, Idaho: 13 of 13; Searles Valley, California: 10 of 11) with the cards set in one column. personCardNode in src/bench/play.mjs hands stripScreen one column when the person has no people line, public record or dev sections, and stripScreen in src/bench/ui/strips.mjs draws one .mx3col (mx3cols.one) with the other half blank.

**Fix.** In stripScreen, a name-beside card with one column of two or more sections sets them in two columns, half each; add people-fills-card.browser.mjs. What goes in the card (P17, P26) is the One person card lane.

**Time box.** 1 hours

**Rules.** Screen to mock: the approved person card sets sections in two columns so no half stands empty. No hand-written player text: no new label is added; the card words are untouched.

**Done when.** A second session, in a drawn place and seed it names, opens People and clicks each person: no card sets its sections in one column beside an empty right half; people-fills-card.browser.mjs passes.

**Waits on.** Nothing

**Files.** src/bench/ui/strips.mjs,src/bench/people-fills-card.browser.mjs (new)
