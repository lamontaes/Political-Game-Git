---
id: tests-group-b-draw-joint-subjects
title: "Group B law reach test: each case draws its own town, since no town in forty has every subject at once"
area: laws
lead: laws
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `src/core2/law-reach-group-b.test.ts` fails on main before any case runs: its shared draw needs one town with named adults the Medicaid expansion covers, named adults the Medicaid work requirement reaches, a named preschool-age child, a private school, a paid school job and a state highway line, and finds none in forty draws. Measured by the laws lead on Oct 25: main at c98a0a28c5 fails this way on seed b859e7d6b13cc7f344a6475e1d26ffa00245ed91436791b312ab8794b75c52c9, and the taxes family branch failed the same way on that seed and on 8c8d12824c0b833720e586d5abb1a9030e006ba6ead39c7d21f587dfc03ce911. A probe of the forty towns that seed draws: only Belk, Alabama (0105164) had all three named groups (11 Medicaid, 1 work requirement, 2 preschool), and it has no private school; most towns have no named adult either Medicaid rule reaches. The welfare time-limit case already draws its own town (`options.need === "time-limit"`). Give the Medicaid, preschool, private school, school pay and highway cases the same: each describe draws a town for only the subjects its own assertions read, never skipped, with the place and seed named on failure.

**Rules.** One rule, all 56 places: tests draw from all 56 and name the place and seed. One model, two tiers: where a case can assert on a counted group the same rule reaches, it may draw on counted residents too.

**Done when.** `src/core2/law-reach-group-b.test.ts` passes on main on three fresh random seeds and on b859e7d6b13cc7f344a6475e1d26ffa00245ed91436791b312ab8794b75c52c9, each case naming the town it drew. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/law-reach-group-b.test.ts

**Notes.** Found by the laws lead while gating PR #5649 (taxes), whose diff changes this test file, so CI runs it there.
