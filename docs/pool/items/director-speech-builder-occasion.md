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

**What.** The director's speech builder delivers speeches through deliverSpeech without an occasion, so those speeches carry no speech:occasion fact. Pass the occasion the builder knows (the scene it staged) so every heard speech names where it was given.

**Rules.** No hand-written player text: the occasion is a record value the English engine words. Replace, never layer: the builder passes the occasion, with no second record beside it.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place, seed named in the PR body) a speech the builder delivers has speech:occasion on its heard event, by record id, and a test in src/director covers it.

**Files.** src/director/speech-builder.ts

**Notes.** Follow-up from core-speech-heard-occasion (PR #5217). src/director belongs to the Words session.
