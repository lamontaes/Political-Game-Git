---
id: words-grade-heat-map
title: "A grade falls on part of a line and reaches every line through a heat map by personality and situation"
area: words
kind: feature
priority: 1
size: M
status: in-pr
claimed-by: story/grade-map
pr: pending
blocked-on:
lead: words
milestone: play-first
source: "owner, Nov 9, 12:30 to 12:55 a.m., through the CTO's Story brief"
claimed-at: 2026-11-09T07:30:00.000Z
---

**What.** The owner, Nov 9, 12:45 a.m.: grades fall on parts of a line (a word, a phrase, the opening, the tone) with a strength such as 50%, and each graded part is a heat map for a personality and a situation that applies across scenes. Today a grade reaches the lines sharing its move, voice and register (#7725), 3,452 of about 10,000 pieces. This item describes every line and every part of a line by features (opening, filler, stock phrase, what it names, question shape, formality, directness, length) and keeps a heat map of graded features by register, voice, kind of scene and register with voice, so every line in every bank is scored and weighted in its own slot.

**Rules.** Sliding scales and causes: a grade moves a line's weight on a sliding curve and never bans or rolls a line. Serves `words-engine`: every bank piece plays unless the owner's grades hold it, and a grade run sets every bank at once.

**Done when.** Every bank piece is scored against the map and its weight in its own slot moves on a sliding curve; grade files can carry span grades with a strength; a test fails when the shipped map disagrees with the banks and grades; the PR reports the share of all lines a graded span reaches now and the share the next batch would reach.

**Time box.** 3 hours. If not done, push what exists, open the PR and write the handoff.

**You will see.** When you grade part of a line, every line with that part in the same kind of scene or the same voice is chosen more or less often.

**Screenshot.** Not a screen; the coverage numbers in the PR body.

**Files.** src/english/span-features.ts, src/english/grade-map.ts, src/english/calibration.ts, scripts/dialogue-batch/grade-map.ts, data/english/grade-map.json, docs/research/dialogue/
