---
id: words-delete-every-line-before-nov-15
title: "Every bank line written before Nov 15 is deleted, and the game starts its words from nothing"
area: words
kind: cleanup
priority: 1
size: L
status: in-pr
standard: 2
claimed-by: story
pr: 10063
after:
blocked-on:
lead: story
model: fable
effort: high
root: none
source: owner, Nov 17, verbatim on #9750 via the CTO ("I said you can delete everything that wasn't written in the past couple days because it's all shit... I'd rather it start from nothing and build it up correctly"; "I don't care if it's thousands of lines or words. Delete it.")
---

**What.** After playing v0.113.0 the owner hit stock scenes and stock replies and ruled that everything the engine did not write from the world goes. The banks still held 13,596 parts written before Nov 15: the whole opening-speech, person-history, news, headlines, journal, scene-words, campaign-standing, speech-stages, bring-it-up, calendar, choice-names and newscast banks and most of conversation and scene-talk.
Seen: the owner's sitting on v0.113.0, Nov 17.

**Cause.** Design: the owner's words of Nov 17 (docs/coordination/OWNER-DECISIONS.md, Nov 17). The banks under data/english/parts kept every line ever authored; nothing deleted a line once a newer way of saying it from the record existed.

**Fix.** Delete every part dated before Nov 15 in every bank, keeping only a scene-talk line of a kept kind that carries a record insert. A bank left with no line and no reader (address, hearing, legislation, minutes) is deleted with its register import, its stopgap rows resolved and its path on the replaced list. The judged and pulled files are re-run and the insert and register baselines fall. A test that only asserted deleted lines is deleted with them; a screen that read an emptied bank shows the record through its worded label until a line written from the record exists.

**Time box.** 6 hours, the Story lead at high.

**Rules.** Old material is deleted, everywhere: no copy of what was replaced is kept. Replace, never layer: the pointers to a deleted bank are fixed in the same pull request. No hand-written player text in code: nothing deleted here comes back as a string in a screen.

**Done when.** A second session starts a new life in a drawn place on main and plays to the first evening and through the first week's talks and the paper, and sees no line from a part dated before Nov 15 (the register and the insert guard count zero of them), every screen that lost its bank showing the record through a label and never a stock sentence; the english guards pass with the baselines lowered.

**Waits on.** Nothing: the three cut pull requests (#9999, #10023, #10011) rewrite the same banks, and whichever lands second merges by key, the deletion standing.

**Files.** data/english/parts, data/english/judged, data/english/pulled.json, tests/guards/english/line-inserts-baseline.json, tests/guards/english/line-register-baseline.json, src/english/line-register.ts, src/director/data/stopgaps.json, docs/current.json

**Notes.**
