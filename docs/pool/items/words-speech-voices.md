---
id: words-speech-voices
title: "Speeches cite real figures, lines fit the kind of speaker, and rhetorical craft (threes, call and response) is earned by skill"
area: people
kind: feature
priority: 2
size: M
status: blocked
claimed-by: claude/political-game-pool-7xkkii
pr:
blocked-on: words-speech-part-words
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:57:07.733Z
---

**What.** Speeches should cite real figures from the world, lines should fit the kind of speaker, and rhetorical craft such as threes and call and response should be earned by the speaker's skill. Today speeches share one voice. The speech composer should pick lines by the speaker's role, background and skill, and fill figures from the records the speech is about.

**Rules.** No hand-written player text: lines come from the English engine's data. No dice: craft follows the speaker's skill, not a roll. An effect is a read, not a record: the composer reads the speaker's skill and the cited records.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place, seed named in the PR body), two speakers of different kinds give speeches on the same topic whose lines differ by kind, each cites a figure read from a named record id, and a skilled speaker's speech uses a device an unskilled one's does not; tests in src/core2/speech-composition.test.ts cover it.

**Files.** src/core2/speech-composition.ts, src/core2/modules/speech.ts

**Notes.** Spec written by the docs cleanup pool-todo-shells-need-spec-oct19b; the item is blocked, so this text is for whoever unblocks it.
