---
id: play-speech-screen
title: "The play screen offers the staged speech: four choices at each of four stages"
area: play
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "words-speech-built-in-stages, PR #4477"
---

**What.** Give the play screen on the new core a way to give a speech. The director already builds a speech in stages (opener, two longer parts on different subjects, closer) with four choices at each stage, and a finished speech can be handed to the speech engine. A screen should show the four choices at each stage, the speech so far, and hand the finished speech to an audience, such as the people at a rally or a council meeting.

**Rules.** No hand-written player text: the screen shows the choice text the builder returns and control names only. This is a game, not a spreadsheet: one pick per stage, no forms. Read-only screens spend no game time; giving the speech is the one act that does. The chain is the acceptance: the picks reach listeners' views.

**Done when.** In a drawn place, a one-year run of the played world (buildBenchWorld) lets the player pick four parts on the screen, the speech is delivered to named listeners, and the screenshot shows each stage's four choices and the finished speech. A test drives the same picks through the screen's data and finds listeners whose stance records cite the speech. The owner plays it: he picks a speech at a rally.

**Files.** src/director/speech-builder.ts (read), the game screens on the new core, src/bench/*

**Notes.** Written when words-speech-built-in-stages (PR #4477) found that no screen on the new core gives a speech yet. giveBuiltSpeech in speech-builder.ts is the call to make when the speech is finished.
