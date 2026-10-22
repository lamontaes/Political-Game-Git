---
id: tests-campaign-day-canvass-someone-answers
title: "The campaign-day canvass test redraws until someone answers the door"
area: play
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/canvass-answers
pr: #5793
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T10:41:58.049Z
---

**What.** src/bench/campaign-day-controls.test.ts checks the door-knocking scene only when someone answered; on a draw where nobody answers it asserts only that there is no scene, so the scene path can go unchecked. A merger sent #5671 back asking that answers be asserted to exist; main's version of the test has the same conditional.

**Rules.** One rule, all 56 places: the places are drawn from all 56 with a bounded number of redraws, each named with its place and seed, and the test never loosens, skips or returns early on a draw.

**Done when.** The test draws places from all 56 with bounded redraws until a canvass is answered, asserts the scene and the answering households there, keeps the nobody-answered assertions for such a draw, fails when the redraws run out, and names place and seed.

**Files.** src/bench/campaign-day-controls.test.ts

**Notes.** Built on #5710's version of the test (branch claude/fs11vb-ev), which plays the campaign day in the played world from buildBenchWorld; every canvass, the first and the ones in the fund-raising days, is checked against the door causes it wrote.
