---
id: words-spoken-marks-reach-shared-weights
title: "The owner's spoken marks on a played line move the lines that share its weights"
area: words
kind: feature
priority: 1
size: M
status: claimed
standard: 2
claimed-by: account-lead-M4
after: words-no-reply-says-the-vote-is-ahead-after-it
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Owner, Nov 15 02:27Z (cmsg_01TQLdz583SA7sRfRB4dFowZ1PxqXT5zVbqydjKy7qFCGS); Account lead's job, Nov 15 02:31Z
claimed-at: 2026-11-15
branch: claude/project-thread-irab2z
---

**What.** The owner marks numbered lines on the Scenes page by voice ("both wordings are good", "a little awkward", "I like wording 2 more"). Each mark moved only that one line. He said: "my grades should hit multiple parts of the engine at once... my impact should go across things I didn't grade."

Seen: in the grade run, where a spoken mark counts only on its own line.

**Cause.** Found in code: `withVoiceGrades` (scripts/dialogue-batch/apply-grades.ts) counts a spoken mark only on its own piece key, and `foldCalibration` (the run that spreads grades through move pairs, trait-to-bearing pulls and register length) reads only 1-to-5 bench rows, so no spoken mark reached a shared weight.

**Fix.** A mark on a played line is read with the spot it stood in, from the page's run files (`scene-marks.ts`: move, previous move, register, bearing, speaker's traits), and sorted as a mark on sound or on meaning (`markKind`). A sound mark on a whole line becomes a bench grade at 3 + 2s on naturalness and trait fit (`spreadBatches`), the inverse of the step the fold already takes; marks on meaning go to the Words lead as rules and never hold a line.

**Time box.** 4 hours for one session.

**Rules.** Replace, never layer: a mark folds through the existing grade files, ledger, calibration table and TUNABLE step, with no new number and no second store.

**Done when.** A second session, on main, runs `npm run words:grade` and reads, for each of the Nov 15 sound marks, the calibration rows it moved; then plays a drawn place's talk at home before and after the fold (place and seed named) and lists every pick or reply order that changed, with the test scripts/dialogue-batch/scene-marks.test.ts green.

**Waits on.** Nothing.

**Files.** scripts/dialogue-batch/scene-marks.ts (new), scripts/dialogue-batch/scene-marks.test.ts (new), scripts/dialogue-batch/apply-grades.ts, scripts/dialogue-batch/spoken-grades.ts, data/english/grades/2026-11-15-scenes-page.json (new), data/english/calibration.json, data/english/part-grades.json
