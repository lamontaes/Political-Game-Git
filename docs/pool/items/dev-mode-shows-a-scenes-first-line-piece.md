---
id: dev-mode-shows-a-scenes-first-line-piece
title: "Dev mode cannot show which first-line piece a staged scene opened on"
area: director
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: 'Owner, Nov 16 00:59Z ("all this stuff that you''re tracing, if it''s not already being traced by the dev mode, it should be"), relayed by the Account lead; election-results thread''s traces of Nov 15 and 16'
---

**What.** Dev mode cannot say which first-line piece a staged scene opened on, or what filled it. The election-results thread's plain-first-lines count (/mnt/project-files/election-results/plain-first-lines-count.md) took a 120-day scripted run at two places to learn which piece each shown scene opened on, and why. This item is only that piece. The route and screen that show each moment as staged or held, and why, are dev-mode-shows-the-directors-day (briefing thread, route `GET dev/director/day?person=&date=`, one row per moment; Account lead, Nov 16: one item for the route). Seen: dev mode's directors-day screen, beside each shown scene.

**Cause.** Found in code: the arrival line is rendered in `src/director/scene.ts` through `wordSceneLine` (`src/english/scene-words.ts`) and `renderGroundedEnglish` (`src/english/grounded-english.ts`). These pick one piece by its key but return only its text and source record ids, so nothing after the render knows which piece was said.

**Fix.** `wordSceneLine` passes back the key `renderGroundedEnglish` already picks, along with the names of the facts that filled it. The arrival in `src/director/scene.ts` keeps both on the scene's first line. The directors-day route returns them as one field on the moment's row, and its screen shows them beside the moment in worded labels. No second route, screen or copy.

**Time box.** 1 hour for one Sonnet session at medium effort, after dev-mode-shows-the-directors-day.

**Rules.** An effect is a read, not a record: the field is the render's own pick, read when the scene is composed, and kept nowhere else. No hand-written player text in code: the screen shows the piece through worded labels, never as a raw key in play. Review: words.

**Done when.** A second session, on main, opens dev mode at Sheridan, Wyoming (5669845), seed 7, as the selectboard member person_0f713cf2e3e20027, plays to April 26, 2025, and reads each shown scene's first-line piece in the directors-day screen. None of the 9 shown scenes is a plain home piece (`scene-words.arrival-home-alone.*`), matching the scripted recount. The same check at a drawn place, named with its seed, shows a piece beside every shown scene.

**Waits on.** dev-mode-shows-the-directors-day.

**Files.** src/english/scene-words.ts, src/english/grounded-english.ts, src/director/scene.ts

**Notes.** None.
