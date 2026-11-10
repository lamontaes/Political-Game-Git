---
id: words-speech-occasion-read
title: "The journal and scenes say where a heard speech was given, from its speech:occasion fact"
area: words
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after: core-speech-heard-occasion
source: added with npm run pool -- add
claimed-at:
standard: 2
model: sonnet
effort: medium
root: rc3-thin-life-record
lead: words
checked: fable 2026-11-10
---

**What.** A speech a person heard becomes a scene or a journal line through the director, which already matches the speech.heard event by its views:speaker fact (src/director/data/situation-types.json, src/director/scheduling.ts). Once core-speech-heard-occasion makes deliverSpeech in src/core2/modules/speech.ts carry an occasion fact (a record id for the rally, hearing or meeting where it was given, as the bench's speechGive in src/bench/campaign.ts now gives speeches in play), have the director bind that record as a fact of the scene and have the English engine word where the speech was given from it. A listener's journal line then says it was a rally, a hearing or a council meeting speech, where today it says only that a speech was heard. The place words come from the record's kind through the engine's part banks, never typed into the scene.

**Cause.** Found in code: `deliverSpeech` in src/core2/modules/speech.ts carries no occasion fact on a speech.heard event (the file has no "occasion"), so the director (src/director/scheduling.ts, which matches speech.heard by its views:speaker fact) cannot bind where a speech was given; core-speech-heard-occasion is open.

**Fix.** After core-speech-heard-occasion lands, bind the occasion record as a fact of the scene and word where the speech was given from the record's kind through the English engine's banks, so a listener's journal line says it was a rally, a hearing or a council meeting speech; a speech with no occasion fact words without one.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the occasion is worded by the English engine from the record's kind, with any new piece authored into data/english/parts with origin and author, never typed in code. Ask why: the line cites the speech record id and the occasion record id it rests on. An effect is a read, not a record: the director reads the occasion fact when it builds the scene, and a fact no scene reads is a placeholder. One rule, all 56 places: occasions are record kinds, never named venues or towns.

**Done when.** A second session, not the builder, runs the test in src/director/director.test.ts over a one-year played world (buildBenchWorld, a drawn place from all 56, seed named) that gives a speech through the bench's speechGive at two kinds of occasion and sees a listener's journal line or scene name each, by the speech record id and the occasion record id; a speech with no occasion fact words without one and does not crash.

**Waits on.** core-speech-heard-occasion.

**Files.** src/director/scheduling.ts, src/director/data/situation-types.json, src/english/english-composition.ts, data/english/parts/address.json, src/director/director.test.ts, src/core2/modules/speech.ts

**Notes.** Checked Oct 20: No speech:occasion fact exists anywhere in src; it needs director-speech-builder-occasion first, and a built speech must first be given in play (giveBuiltSpeech has no caller outside tests). Nothing to build until a producer gives a built speech in play; the occasion would then be a record id (the rally, hearing or meeting it was given at), never typed text.

Oct 20 (pool feeder): spec written; the earlier note that no play producer of built speeches exists is out of date (bench speechGive calls giveSpeech), so what remains is core-speech-heard-occasion (in-pr) writing the fact. director-speech-builder-occasion, blocked on the same stale reason, overlaps core-speech-heard-occasion and should be dropped or re-pointed by the lead.
