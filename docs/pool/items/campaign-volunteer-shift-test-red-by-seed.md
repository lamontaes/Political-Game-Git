---
id: campaign-volunteer-shift-test-red-by-seed
title: "The volunteers-walk-doors test passes in every drawn place: its exact check matches what the engine kept"
area: elections
kind: bug
priority: 1
size: S
status: done
claimed-by: governing/volunteer-shift-test-by-seed
pr: #6977
blocked-on:
lead: governing
source: Checker 2, Nov 1 (regating #6912); filed by the governing lead
claimed-at: 2026-11-01T14:42:54.209Z
---

**What.** src/core2/campaigns.test.ts "volunteers walk the campaign's doors in the evening their work leaves free" fails on clean main with GOLDEN_PATH_SEED=chk2-a, comparing 0.03929 with 0.03932 at nine decimal places (Checker 2, Nov 1, regating #6912). One of its exact checks (the shift carry, OPENING_CARRY plus shiftShare less one, or the discretionary hours left) is computed from state the shift itself changed, or the engine rounds where the test does not. A test that is red by seed blocks every PR whose checker draws that seed.

**Rules.** Ask why: find the cause by record (which value, read when, changed by what) before changing anything, and never loosen the tolerance to hide a real difference. One rule, all 56 places: the fixed test passes under chk2-a and under three fresh seeds, each naming its place.

**Done when.** The test passes with GOLDEN_PATH_SEED=chk2-a and three fresh seeds, each printing its place; the PR body names the assertion that failed, the cause by file and line, and why the fix is the engine's or the test's; if the engine was wrong, a break-it run shows the old code failing the corrected check.

**Files.** src/core2/campaigns.test.ts, src/core2/modules/campaigns.ts

**Notes.** TODO
