---
id: core-speed-year-policy-young-generation
title: "The speed-year measurement runs with the young-generation size play and the guards use"
area: core
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/speed-year-policy-semi-space
pr: #5820
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T00:14:16.654Z
---

**What.** npm run speed:year runs Node with V8's default 16 MiB young generation, while the guard policy (nodeSemiSpaceMiB in scripts/core2-guard/policies.json) and the desktop play server both run at 64 MiB. So the speed rule is measured on a setting play never uses, and Long Hill's year read about 20 seconds slower than play runs it. The script takes the policy's flag, and a test keeps the two equal so they cannot drift apart again.

**Rules.** Speed: a town's year is measured the way play runs it, before and after on the same machine, one process at a time. Bookkeeping is a debug switch: the measurement keeps it off, as play does.

**Done when.** package.json's speed:year runs with --max-semi-space-size equal to nodeSemiSpaceMiB, and a test in scripts/speed-years/compare.test.ts fails when they differ; npm run speed:year -- --seed m7b --exclusive in the played world (buildBenchWorld, Long Hill, Connecticut) is measured before and after on the speed lead's fixed machine, both in the PR body.

**Files.** package.json, scripts/speed-years/compare.test.ts, docs/release/changes/speed-year-uses-policy-young-generation.md

**Notes.** Split Oct 24 by the speed lead from core-speed-year-over-limit-dense-town so PR #5820 has a bounded item of its own (the merger's send-back of Oct 23); the umbrella stays open.
