---
id: standin-president-address-register-card
title: "The President's opening address composes under its own register card, not election night's"
area: words
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10
lead: words
standard: 2
model: sonnet
effort: medium
root: design-words-machine
---

**What.** The President's opening address (State of the Union or inaugural) is composed with the register card for election night's speech, because no card exists for a President's address. Its length, devices and checks are therefore those of a victory speech.

**Cause.** Found in code: src/director/opening-story.ts line 1047 to 1054 calls composeAddress with the register "election-night" (stand-in SG-PEOPLE-address-register). src/english/speech-registers.ts lists the registers (line 22 to 34) and its cards (REGISTER_CARDS, line 115 on); there is none for a President's address, while town-hall and rally cards exist with empty checks.

**Fix.** Add a register "presidents-address" to the register list and REGISTER_CARDS in src/english/speech-registers.ts: setting public-address, the public-address devices, swearing never, and checks counted from published State of the Union and inaugural texts (the share that open by thanking the chamber or people, include a figure, make an explicit ask, and the median length in words), each check carrying its source and spread like the existing cards. Have src/director/opening-story.ts pass the new register to composeAddress, delete the markWordsStopgap call and the marker comment, and resolve the stand-in in src/director/data/stopgaps.json. Cost: one table row read when the opening address is composed, once per world.

**Time box.** 5 hours for one Sonnet session.

**Rules.** Words come from the English engine's banks, never hand-written in code (scene-standard). Numbers on the card are counted and sourced, never typed without a citation. No dice. One rule, all 56 places: the address never names a place in logic.

**Done when.** A second session opens a new world in a drawn place (place and seed named), reads the President's opening address on screen, and finds it composed under the President's-address card (the card id appears in the dev-mode record of the address) with its length and checks inside the card's spread; the stand-in marker is gone from src/director/opening-story.ts.

**Waits on.** Nothing.

**Files.** src/english/speech-registers.ts, src/director/opening-story.ts, src/english/english-composition.ts, src/director/data/stopgaps.json
