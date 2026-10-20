---
id: words-speech-occasion-read
title: "The journal and scenes say where a heard speech was given, from its speech:occasion fact"
area: words
kind: wiring
priority: 3
size: S
status: blocked
claimed-by:
pr:
blocked-on: director-speech-builder-occasion
source: added with npm run pool -- add
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** Checked Oct 20: No speech:occasion fact exists anywhere in src; it needs director-speech-builder-occasion first, and a built speech must first be given in play (giveBuiltSpeech has no caller outside tests). Nothing to build until a producer gives a built speech in play; the occasion would then be a record id (the rally, hearing or meeting it was given at), never typed text.
