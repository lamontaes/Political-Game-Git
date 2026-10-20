---
id: tests-early-returns-office-proof-staging
title: "Two tests end early in a drawn place without the case: the ten-day state office play and the scene-staging turn"
area: core
kind: cleanup
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `src/core2/office-proof.test.ts` plays ten days as a state legislator and as the governor, and returned at once when the single drawn place had no such seat (some territories have none), so it passed without playing a day. `src/bench/scene-staging.test.ts` returned when the two standing spots it picked sat at the same position, so it passed without checking which way two people turn. Both now draw until the case exists: the office test draws up to eight places until one seats a legislator and a governor and names every place it passed over, and the staging test only draws a painted place with two standing spots at different positions. The `src/director/civic-roles.test.ts` clerk test has the same early return, but that file belongs to the Words session, so it stays for them.

**Rules.** One rule, all 56 places: the draw is from all 56 and names place and seed, and a test that cannot reach its case fails by name instead of passing empty.

**Done when.** In the played world (`buildBenchWorld`) in a drawn place and a seed the builder did not choose, `src/core2/office-proof.test.ts` plays its ten days for both offices and `src/bench/scene-staging.test.ts` checks the turn in a painted place, each file passing on random seeds with no bare return left before an assertion.

**Files.** src/core2/office-proof.test.ts, src/bench/scene-staging.test.ts

**Notes.** Sent back to open on 2026-10-20 (merger): merge-main conflict in src/core2/office-proof.test.ts. Left for the Words session: `src/director/civic-roles.test.ts` line 275 ("finds the same clerk from a filing's own record") returns when the drawn place's filing office is a state board; it should draw a further place with `worldWith` (`src/core2/tooling/world-with.ts`). The other bare returns the grep lists in `journal-state.test.ts` and `finance-plan.test.ts` sit inside a callback whose effect the test asserts afterward, so they are not skips.
