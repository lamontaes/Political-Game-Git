---
id: screens-people-faces
title: "Everyone on the People map is a round headshot, no box"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: screens/people-faces
pr: #6496
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T02:46:32.515Z
---

**What.** The owner, Oct 28, on the People screen, relayed by the CTO at 01:05 UTC: no black box around anyone; each person is a headshot or the cut-out figure. Ties not in the room show initials in a square box.

**Rules.** One rule for every person with a figure; faces come from the same figure the rooms draw (no new art); no hand-written player text.

**Done when.** Every tie with a figure shows a round headshot of their own figure on the People map, no square box, no-scroll.browser.mjs and people.browser.mjs passing, and before and after screenshots from drawn places.

**Files.** src/bench/card.ts, src/bench/scene.ts, src/bench/whole-figures.ts, src/bench/play.mjs, src/bench/play.css

**Notes.** TODO

Oct 29 (CTO): set done; PR #6496 merged (the done flip failed while branch protection refused the flip job's push).
