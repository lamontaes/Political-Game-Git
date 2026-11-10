---
id: words-trade-refusal-caller-name
title: "A trade refusal answers the trade, an address keeps its promise, and a caller already named is named again by first name"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: story/director-trade-and-address
pr: 8081
blocked-on:
lead: words
milestone: play-first
source: "batch 4 capture, Nov 9 (the two rows left by words-batch-4-reads-wrong) and a played-year review of scenes for the player"
claimed-at: 2026-11-09T20:45:00.000Z
---

**What.** Three lines read wrong in play. A colleague refusing a vote trade said "That's not mine to give." after the player asked for their vote in return, which answers nothing. A President's address said "I trust Vice President {name}. You'll see why." and no step ever said why. A job-offer call named the caller in the arrival line and then said "Someone is calling about your application", because the scene's who() returned nothing for a stranger the arrival had already named.

**Rules.** No hand-written player text: the two lines are reworded in their banks under their keys, neither of which carried a grade, and the caller's name comes from the person record. Ask why: each fix names its cause by file and piece key.

**Done when.** src/director/reads-wrong.test.ts in a played world drawn from all 56 places finds no "not mine to give" and no "You'll see why" in any scene or bank, and the job-offer call names the caller it named on arrival; the call test fails without the fix on seeds irr-a and irr-b.

**Files.** src/director/scene.ts, data/english/parts/scene-talk.json, data/english/parts/opening-speech.json, src/director/reads-wrong.test.ts

**Time box.** 1 hour.

**You will see.** "I don't trade my vote. Not for yours, and not for anyone's." and a caller who stays named.

**Screenshot.** The job-offer call and a vote ask that ends in a refused trade.
