---
id: tests-campaign-day-canvass-someone-answers
title: "The campaign-day canvass test redraws until someone answers the door"
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

**What.** src/bench/campaign-day-controls.test.ts checks the door-knocking scene only when someone answered; on a draw where nobody answers it asserts only that there is no scene, so the scene path can go unchecked. A merger sent #5671 back asking that answers be asserted to exist; main's version of the test has the same conditional.

**Rules.** TODO

**Done when.** The test draws places from all 56 with bounded redraws until a canvass is answered, asserts the scene and the answering households there, keeps the nobody-answered assertions for such a draw, fails when the redraws run out, and names place and seed.

**Files.** src/bench/campaign-day-controls.test.ts

**Notes.** TODO
