---
id: director-appointment-scene-governor-none
title: "A confirmed governor's appointment gives no scene (Butte City, Idaho, seed 068f93eaec28e94b22c007bae8e071806698ffcb)"
area: director
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `src/director/appointment-scenes.test.ts` failed in Butte City, Idaho (seed 068f93eaec28e94b22c007bae8e071806698ffcb) because no central bank governor's seat was filled in the year, so there was no appointment to make a scene of. The code leaves a member in place when no nominee is confirmed (central-bank-appointments.ts), so an empty year is allowed; the test now draws up to six places and fails only if none fills a seat (same change as board-appointer.test.ts). Why a year in some places confirms no nominee was not traced.

**Rules.** None beyond the test's.

**Done when.** The test passes in a fresh draw (it did, seed as1). Open question for the board item: why some worlds' Senates confirm none of the president's candidates.

**Files.** src/director/appointment-scenes.test.ts

**Notes.** Same cause as the board-appointer test in Pago Pago, American Samoa (seed 5b1ffb9b75d06a9c3ed538afaba3d4c4fff0e850a169e9908527297caa8c7ed9).
