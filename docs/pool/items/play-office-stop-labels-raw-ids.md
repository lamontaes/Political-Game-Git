---
id: play-office-stop-labels-raw-ids
title: "The office sheet's stop toggles show raw ids (own-hearing, floor-vote, whip-ask) instead of worded labels"
area: play
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On Politics, Your office, the toggles that choose which moments stop the clock are labeled with their kind ids: own-hearing, state-of-the-state, floor-vote, whip-ask, joint-address, budget-request and nomination. The screen should name each moment in words. Seen in the PR #5533 browser run.

**Rules.** No hand-written player text: the label is a control name from the bench's controls data or comes from the English engine.

**Done when.** In a bench world drawn from all 56 (place and seed named), the office sheet's stop toggles show a worded name for every stop kind, shown by a screenshot in the PR and a test in src/bench that fails on any toggle whose label equals its kind id.

**Files.** src/bench/office.ts, src/bench/data/controls.json

**Notes.** Found by the browser run on PR #5533.
