---
id: director-appointment-scene-governor-none
title: "A confirmed governor's appointment gives no scene (Butte City, Idaho, seed 068f93eaec28e94b22c007bae8e071806698ffcb)"
area: director
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/appointment-scene-governor
pr: #5001
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T23:44:01.448Z
---

**What.** `src/director/appointment-scenes.test.ts` expected a central bank governor's appointment scene in every place and failed in Butte City, Idaho (seed 068f93eaec28e94b22c007bae8e071806698ffcb) with zero appointments in 420 days. No scene was missing: the board's appointer (`src/core2/board-appointer.ts`) ran on February 1 and March 1, 2026 and returned no pick both times, because the Senate did not confirm the nominee (`nominateAndConfirm` returned no nominee), and the Federal Reserve Act's holdover rule keeps the old member on (`src/core2/central-bank-appointments.ts`). With nothing appointed there is no cause for a scene. The test now draws on, up to eight places, until one confirms a governor, and names each place it passes over.

**Rules.** No dice: a confirmation follows the nominee's alignment, qualification and the Senate's sides, as before. Wire to the world: the scene still reads the board's own appointment record.

**Done when.** In a played world (`buildBenchWorld`, places drawn from all 56 with the seed in the failure message) the test finds a place that confirms a governor and checks the scene's appointer and appointee by record id; it passes with seed 068f93eaec28e94b22c007bae8e071806698ffcb, which failed before.

**Files.** src/director/appointment-scenes.test.ts

**Notes.** Open question for the government area, not changed here: the same candidates are put forward every month (`boardCandidates` is seeded by the vacancy alone), so a nominee the Senate rejects is rejected again until the Senate changes. A president whose nominee fails could name another.
