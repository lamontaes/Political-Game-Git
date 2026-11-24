---
id: play-pt-one-person-card
title: "Every person card opens through showPerson in one layout filled from records (Nov 23 sitting rows P9, P10, P14 to P17, P23 to P26, P28, C11)"
area: play
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** The President's card from the address and a council member's card from Politics come from one function but draw two layouts, scene busts open nothing, and the card leaves age, home, spouse, children, offices with their places and work empty. Make one fixed layout filled from the records. Seen: the President's card from the address scene beside a council member's card from Politics.

**Cause.** Found in code: scene busts (`drawTalkStrip()` in src/bench/play.mjs) had no click; `fitLifeStory()` in src/bench/play.mjs switches layout by story length; `personCardNode()` in src/bench/play.mjs reads only relation, party and age, and src/bench/card.ts does not send home, spouse, children or offices with years and places.

**Fix.** Pass onCard to bustStrip so anyone on a strip opens showPerson; one fixed layout with no scrolling; send and draw age, home, spouse, children and offices with places and years from the records; stance rows in plain words; the one-face-one-card guard fails a second card path.

**Time box.** 6 hours

**Rules.** Wire to the world: every fact on the card is read from a record. One engine per mechanic: one renderer for every card. No hand-written player text: labels reuse src/bench/data/controls.json.

**Done when.** A second session, on main in a drawn place, opens the President's card from the address scene and a council member's card from Politics and sees the same layout filled from records, nothing scrolling, and the X closing it.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs,src/bench/card.ts,src/bench/ui/strips.mjs,src/bench/ui/bust-strip.mjs,tests/guards/one-face-one-card.test.ts
