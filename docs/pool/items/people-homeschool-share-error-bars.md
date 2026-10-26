---
id: people-homeschool-share-error-bars
title: "Homeschool share by state uses a simple standard error; replace it with the survey's replicate-weight error"
area: people
kind: research
priority: 3
size: S
status: done
claimed-by: claude/pool-homeschool-error-bars
pr: #5497
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:13:54.236Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** From PR #5493. The Household Pulse files carry replicate weights (HWEIGHT1-80); the table's standardError is the simple one for the household count. Massachusetts, New York and New Jersey all read 2.5 percent; checked, their raw answers are mostly missing codes and the few real ones coincide, so it is not a clipping artifact.
