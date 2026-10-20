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
source: added with npm run pool -- add
---

**What.** A heard speech event now carries the fact speech:occasion (campaign, meeting, hearing, party-meeting, address or press), written by core2 callers. Nothing reads it yet. Have the English engine and the journal say where a speech was given when they word a heard or retold speech.

**Rules.** An effect is a read, not a record: the journal and the scene words read the occasion fact. No hand-written player text: the words come from the English engine.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place, seed named in the PR body) a heard speech's journal line names its occasion, citing the speech record id, for at least a campaign statement and a hearing remark; a test in src/director covers it.

**Files.** src/director/journal.ts, data/english/

**Notes.** Follow-up from core-speech-heard-occasion (PR #5217). Words session builds it.
