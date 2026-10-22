---
id: words-calibration-traits-pairs-replies
title: "Calibration gets per-trait pulls, move-pair naturalness and reply ranking, beyond piece grades and register length"
area: words
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: words-bench-calibration
source: added with npm run pool -- add
claimed-at:
---

**What.** The calibration table (data/english/calibration.json, read through src/english/english-calibration.ts) holds only each piece's running grade and each register's target length, and composeGroundedLine in src/english/english-composition.ts prefers graded pieces by calibrationScore. Add three more weights the engine reads. First, a per-trait pull: for each trait the speaker carries, how far its lines run longer or shorter and how far it leans toward each bearing, folded from the trait-fit and length axes by foldCalibration in scripts/dialogue-batch/apply-grades.ts and added into calibrationScore using the speaker's own traits. Second, a per-move-pair weight that records whether two moves in that order read naturally, folded from the naturalness axis and read when the engine arranges moves. Third, a reply weight read by rankChoices in src/director/conversation.ts next to the player's reply-reach lean. Every weight is TUNABLE with its spread.

**Rules.** An effect is a read, not a record: a weight nobody reads when the engine chooses or ranks is a placeholder, so each of the three must change a choice in a test. No dice: the traits and the grades decide the choice, and an equal score keeps the stable order, never a roll. No hand-written player text: only weights are added, and every line still comes from the English engine's pieces. Estimate, never UNKNOWN: a trait, pair or reply with no grade scores zero and changes nothing, so an ungraded table behaves as it does today. Replace, never layer: the register-length rule stays the one length rule and the trait pull adjusts its target rather than adding a second length score.

**Done when.** A test in scripts/dialogue-batch/calibration.test.ts applies grades and shows a trait-weighted piece choice, a move-pair arrangement and a reply ranking each differ before and after a grade, named by trait, pair and reply keys. The same test composes a line in a one-year played-world run (buildBenchWorld, a place drawn from all 56, a seed the builder did not choose) and names the scene's record ids, and calibration.json parses with a spread on every new weight.

**Files.** data/english/calibration.json, scripts/dialogue-batch/apply-grades.ts, src/english/english-calibration.ts, src/english/english-composition.ts, src/director/conversation.ts, scripts/dialogue-batch/calibration.test.ts

**Notes.** Split from words-bench-calibration Oct 19.

Oct 20 (pool feeder): spec written; words-bench-calibration is done and its Notes name this remainder; the item was only an empty shell, so the three weights are named here from the parent's design.
