---
id: words-president-asks-say-the-power
title: "The President's keep-a-law and oppose asks say 'I'll fight anybody' instead of the power the President holds (the veto, a bill sent to Congress)"
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
model: opus
effort: medium
root: none
source: Story lead's read of #9840, Nov 17 (the addresses' follow-ups)
---

**What.** A governor's ask now says what the governor will do with the powers they hold (the veto), but the President's asks were not reread. Pieces such as "I'll fight anybody who tries to undo it" announce a mood, not a power the President has.
Seen: Big Lake, Alaska (0207070), seed press-1117:0, the President's address pressed at claude/story-addresses-unit4.

**Cause.** Found in code: data/english/parts/opening-speech.json, the `ask` pieces for the subjects inaugural and state-of-the-union that say "fight anybody" or "fight", read by src/director/speech-outline.ts `planSpeech` through `askMove`; #9831 redrafted only the keep-a-law asks that said "on the books".

**Fix.** The Story lead rereads every President's ask in opening-speech.json and redrafts each that names no power the President holds (sign, veto, send Congress a bill, ask Congress to vote), deleting the old pieces in the same change.

**Time box.** 3 hours, one Opus session at medium effort.

**Rules.** No hand-written player text: every redrafted ask is a bank piece the Story lead signs before the PR leaves draft.

**Done when.** A second session starts three new games at a drawn place each, writes down the place and seed, and sees every ask in the President's opening address name a power the President holds; and no ask piece for the inaugural or the State of the Union says "fight anybody".

**Waits on.** Nothing.

**Files.** data/english/parts/opening-speech.json

**Notes.** Filed from the addresses thread (#9831, #9840).
