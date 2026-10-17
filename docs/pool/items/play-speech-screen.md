---
id: play-speech-screen
title: "The play screen offers the staged speech: four choices at each of four stages"
area: play
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/speech-screen
pr: #4815
blocked-on:
source: "words-speech-built-in-stages, PR #4477"
claimed-at: 2026-10-16T20:26:31.154Z
---

**What.** Checked against main on Oct 16: The speech builder (`src/director/speech-builder.ts`, `giveBuiltSpeech`) is not on main; the only speech control is the one-click Speech button. Next: After the builder lands, a four-by-four speech screen on /play. The player would see it as a choice among people, never a form.

**Rules.** No hand-written player text: the screen shows the choice text the builder returns and control names only. This is a game, not a spreadsheet: one pick per stage, no forms. Read-only screens spend no game time; giving the speech is the one act that does. The chain is the acceptance: the picks reach listeners' views.

**Done when.** A test in src/bench drives four picks in a drawn place (buildBenchWorld, seed named in the PR body) and finds listeners' stance records citing the speech record id. The owner plays it: After the builder lands, a four-by-four speech screen on /play.

**Files.** src/director/speech-builder.ts (read), the game screens on the new core, src/bench/*

**Notes.** Written when words-speech-built-in-stages (PR #4477) found that no screen on the new core gives a speech yet. giveBuiltSpeech in speech-builder.ts is the call to make when the speech is finished.
