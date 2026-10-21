---
id: words-calibration-traits-pairs-replies
title: "Calibration gets per-trait pulls, move-pair naturalness and reply ranking, beyond piece grades and register length"
area: words
kind: feature
priority: 3
size: M
status: blocked
claimed-by: claude/pool-calibration-pairs
pr:
blocked-on: Words line: the item text is an empty shell and the work is calibration of the English engine's pair and reply ranking
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:33:43.864Z
---

**What.** The calibration table built under words-bench-calibration holds each piece's running grade and each register's target length. The rest of that item's design is not built: per-trait pulls toward each bearing and toward longer or shorter lines, per move pair whether the arrangement read naturally, and reply ranking in src/director/conversation.ts. Build them as more weights in data/english/calibration.json that the engine reads.

**Rules.** An effect is a read, not a record: a weight nobody reads is a placeholder. No dice; every number TUNABLE with its spread.

**Done when.** A test in scripts/dialogue-batch/calibration.test.ts shows a trait-weighted choice and a reply ranking differ before and after a grade.

**Files.** data/english/calibration.json, scripts/dialogue-batch/apply-grades.ts, src/english/english-composition.ts, src/director/conversation.ts

**Notes.** Split from words-bench-calibration Oct 19.
