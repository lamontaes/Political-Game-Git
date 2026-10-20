---
id: director-speech-builder-occasion
title: "The director's speech builder names the occasion of a speech it delivers"
area: director
kind: wiring
priority: 3
size: S
status: blocked
claimed-by:
pr:
blocked-on: a play producer of built speeches
source: added with npm run pool -- add
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** Checked Oct 20: deliverSpeech (src/core2/modules/speech.ts:99) has no occasion field and emits no speech:occasion fact; the builder's giveBuiltSpeech (src/director/speech-builder.ts:390) has no caller outside tests, so nothing in play gives a built speech. Nothing to build until a producer gives a built speech in play; the occasion would then be a record id (the rally, hearing or meeting it was given at), never typed text.
