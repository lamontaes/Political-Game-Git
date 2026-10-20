---
id: core-counted-weight-money-small-town-red
title: "counted-weight-money.test fails in most drawn towns on main: a weighted payroll pays above its expected scale or withholds the wrong tax (Marlene Village, Oregon, GOLDEN_PATH_SEED 672034c3027cbaf4f3aeb0f9d5048ca3bc4290dba68aea3e8dd431f8990767d8)"
area: core
kind: bug
priority: 3
size: S
status: claimed
claimed-by: claude/political-game-pool-7xkkii
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:49:23.390Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** Two causes. (1) A very small town had too few counted rents or payrolls to compare (Solen, North Dakota: 2 rents); the test now draws places in turn until one has enough and honors GOLDEN_PATH_SEED, in the PR that carries this note. (2) The real defect, replayable: in Marlene Village, Oregon (GOLDEN_PATH_SEED 672034c3027cbaf4f3aeb0f9d5048ca3bc4290dba68aea3e8dd431f8990767d8) the payroll flow residents:wages:opening-payroll-calendar:organization_2c72ac5d25d3703a pays 48,400,178 against an expected 48,117,495 at its weight, and in Aurora, Oregon (seed 49549e3d981331a0a5db090c892ab6ba6ea266a295a6f998f64e1c82af2ddecf) the tax withheld is 248,917 against an expected 5,230 after weighting. Both fail the same way on clean main with the test as now written. Two of three random draws failed on the branch. Find whether the weighted payroll or the test's expected scale is wrong.
