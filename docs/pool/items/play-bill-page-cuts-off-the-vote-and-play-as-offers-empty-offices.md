---
id: play-bill-page-cuts-off-the-vote-and-play-as-offers-empty-offices
title: "A bill's page cuts off its vote buttons, shows an empty Staff heading, and Play as offers other states' officials whose office is empty (Red Hook, U.S. Virgin Islands)"
area: play
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/fable-b-bill-page-fits
pr: #8542
after:
blocked-on:
lead: screens
source: "Fable B, Nov 11, 2026: the merge desk's bill-stage timeout on #8511, replayed on its seed"
model: opus
effort: medium
root: rc10-screens-keep-own-facts
checked: fable 2026-11-11
---

**What.** The merge desk saw the bill-stage browser check time out once in Red Hook, U.S. Virgin Islands (seed db361725-5539-4b28-b010-49e03f7bdb11) and pass on a second draw. Replayed on that seed, it fails every time, and it showed three defects a player meets. (1) Advanced's Play as list offers every official in the country, other states' legislators and governors among them. Their states are held as results only, so stepping in as one gives an office with nothing in force and nothing to write a bill about; the check had stepped in as the chairman of another place's council. (2) A bill opened from Your office or Bills puts where it stands, the staff and Your vote under its three columns, so on a bill of ordinary length they fall off the foot of the sheet, and the sheet scrolls as a page to reach the vote buttons. (3) A bill the player wrote on a subject with no law in force shows a Staff heading with nothing under it. Seen: Advanced's Play as list, and every bill's page opened from Your office or Bills.

**Cause.** Found in code: `officeholders` in src/bench/officeholders.ts lists every serving term in the offices table and never asks `isOutsideOffice` (src/core2/modules/offices.ts, line 258), the one test for another place's office. `openBillPaper` in src/bench/play.mjs passes `billStageSections(...)` to `show()` after the bill's board, so they sit below a three-column grid as tall as its longest column, and `#sheet-body` scrolls (`overflow-y: auto` in src/bench/play.css). `billStageSections` in src/bench/ui/bill-stage.mjs draws the Staff section whenever `stage.yours.mayRedraft` is true, and its buttons only from `stage.sectionsAmendable`, which is empty when no section has a law in force.

**Fix.** Skip a term whose office `isOutsideOffice` in `officeholders`. Give `billPaper` (src/bench/ui/bill-paper.mjs) the stage sections to stand in its first column, under Where it is, and make the bill board keep to the sheet's height with each column scrolling inside itself. Draw the Staff section only when `stage.sectionsAmendable` has an entry. In src/bench/bill-stage.browser.mjs, stop drafting around a body with no subject in force: fail by name with the seed and the subjects passed over.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the stage sections move into the bill's board in the same change, and nothing is left drawing them under it. An effect is a read, not a record: Play as reads the one test every engine uses for another place's office (`isOutsideOffice`) and keeps no list of states of its own. A menu never scrolls as a page (owner, Nov 5): a long column scrolls inside its own box. No heading stands with nothing under it. Tests that draw their place (`drawn-place-tests`): a check names what it passed over and never passes or fails by the luck of the draw.

**Done when.** A second session, not the builder, starts the bench on main at 1440x900 in a drawn place (named, with its seed), opens Advanced and builds the world, and finds no official of another state in the Play as list (searching the list for another state's name returns nobody). It steps in as a member of a local body, writes a bill from Your office, opens its page and sees Where it is, the bill and What it would do side by side with Your vote on screen without scrolling the sheet. In Red Hook, U.S. Virgin Islands (seed db361725-5539-4b28-b010-49e03f7bdb11) the Play as list holds no council of another place.

**Waits on.** Nothing.

**Files.** src/bench/officeholders.ts, src/bench/ui/bill-paper.mjs, src/bench/ui/bill-stage.mjs, src/bench/play.mjs, src/bench/play.css, src/bench/data/controls.json, src/bench/bill-stage.browser.mjs
