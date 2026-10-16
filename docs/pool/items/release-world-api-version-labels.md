---
id: release-world-api-version-labels
title: "Core API version labels collide (v12 to v16 appear twice)"
area: release
kind: cleanup
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The world session's seams carry core2-api-v12 to v16 in job-lifecycle.ts, finance-state.ts and types.ts, and the core's `rerateJob` is also labeled v12. Relabel the comments so each label names one thing, and delete the claim that a version label means anything at play.

**Rules.** No dice (a death or a move comes from causes); an effect is a read; one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** No two seams carry the same label; a search finds each label once.

**Files.** src/core2/job-lifecycle.ts, src/core2/finance-state.ts, src/core2/types.ts, src/core2/modules/laws.ts

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/coordination/world.md), checked against main on Oct 16, 2026.
