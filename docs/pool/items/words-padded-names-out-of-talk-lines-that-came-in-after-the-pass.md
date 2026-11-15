---
id: words-padded-names-out-of-talk-lines-that-came-in-after-the-pass
title: "Take the listener's name off talk lines that came in after the padding pass"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Words lead's second reader, Nov 14, 2026, fourteen lines that kept the listener's name (the second reader named eighteen; four are thank-you, plea or introduction lines the rulings let stay); Account lead thread, Nov 14
checked:
---

**What.** Owner, Nov 14, 06:38Z: "Lines keep saying the listener's name ('Thanks, Alice.' 'Not yet, Eva.') only to pass a rule... The padded names come out." Nine of fourteen lines (the other five go in their own pull request, "I'll be okay", "I'll be careful", "Somebody has to run for {office}", "You think it's a mistake?" and "We'll have to agree to disagree", because they could not be shown said) that came in on Nov 12 to 14 still end on the listener's name, all in `conversation.json` (own-view, player-news and government-news answers); the other four of the eighteen the second reader named are a thank-you, a plea and an introduction the Words lead's rulings let stay. The guard let them in because the name counted as the line's insert. Seen: a household member answering the player's news or a government's act in a played life, without the name on the end of the line.

**Cause.** Found in code: `hasInsert` in `tests/guards/english/line-inserts.test.ts` counts a line as carrying an insert when its text names any slot, so `{first}` at the end of "I'd be for it, {first}." passed the rule, and a line gated on a fact is excused as placed. Nothing read the name by itself.

**Fix.** The nine lines lose the name (and the empty `first` condition on their use); the guard reads the listener's name at the head of a sentence or before its closing punctuation and counts each bank's padded lines in `line-inserts-baseline.json` (`vocativeNames`), so a bank may only go down. A thank-you, apology, plea and call across a room are read by rule, not by key.

**Time box.** 1 hour, Sonnet.

**Rules.** No hand-written player text in code; a reworded line goes to the second reader, its pairs to M5.

**Done when.** The guard test fails on a new bank line like "I'd be for it, {first}." and passes on this branch; none of these nine lines carries the name; the baseline names `conversation` and `scene-talk` only. In three drawn places (name each place and seed), a test plays the player-news and government-news talks at home through every answer and finds none with the listener's name tacked on. A second session, on main, plays a life, tells a household member the player's news and what a government did, and sees the answers read without the name added.

**Waits on.** Nothing; the guard baseline counts scene-talk after the pull request that took its padded names out (#9213) folds.

**Files.** data/english/parts/conversation.json, tests/guards/english/line-inserts.test.ts, tests/guards/english/line-inserts-baseline.json

**Notes.** The other padded names in `conversation.json` (own-view agree, news answers, farewells with the player's name) stay under the baseline; that bank was left out of the padding pass.
