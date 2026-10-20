---
id: words-speech-craft-earned
title: "Crafted devices in a speech (a list of three, a contrast, a callback) are earned by the speaker's recorded speaking experience"
area: words
kind: feature
priority: 3
size: M
status: claimed
claimed-by: claude/speech-craft
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T07:50:34.424Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Built Oct 20 on claude/political-game-pool-7xkkii (PR #5196) before I saw the claim by claude/speech-craft: a speaker's crafted lines (authored with a device: a list of three, a contrast) weigh in proportion to the finished speeches they have composed, none for a first speech and a plain line's weight at twelve (parameter speechCraftSpeechesForFull, TUNABLE, spread 5 to 30), chosen by the renderer's stable hash with no roll; speechesGivenBy reads the kept compositions. src/english/speech-craft.test.ts proves it in a drawn place: twelve composed speeches use devices across the platform's stands and none uses none. If claude/speech-craft has built the same, only one should merge; nothing here depends on the other.
