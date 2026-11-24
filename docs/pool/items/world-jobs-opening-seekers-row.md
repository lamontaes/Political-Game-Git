---
id: world-jobs-opening-seekers-row
title: "SG-WORLD-jobs-opening-seekers is still open though its item is done: resolve it with the labor-force counts or reopen the mechanic"
area: world
kind: stopgap
priority: 2
size: S
status: done
claimed-by: claude/opening-seekers-row
pr: #5754
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T21:24:54.249Z
---

**What.** The pool item world-jobs-opening-seekers is done (PR 5211), but its stopgap row SG-WORLD-jobs-opening-seekers is still open on main: the opening's job seekers are still the jobless working-age adults whose money covers the fewest days, sized by the nation's unemployment rate. Check what that PR built against the row's replacement (the two-level population's labor-force counts by place, age and job, from CPS and LAUS). Then resolve the row naming the code, or finish the missing part and remove the marker.

**Rules.** Replace, never layer: a row is resolved only by its replacement, never by deleting it; the marker goes in the same change. One rule, all 56 places: labor-force shares come from per-place data, never a named state.

**Done when.** The row is resolved in src/core2/data/stopgaps.json with a resolution naming the code. A one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) shows the opening's job seekers by record id matching the place's labor-force counts, and the tripwire test passes.

**Files.** src/core2/modules/jobs.ts, src/core2/data/stopgaps.json

**Notes.** Split from world-stopgap-jobs-faked-mechanic.
