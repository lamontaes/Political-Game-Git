---
id: people-displaced-ambition-share-high
title: "M1-11: 27% of displaced workers form a prove-oneself ambition in Eden, Utah, above the 25% ceiling"
area: people
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/quirky-ride-vrwwz4-drives
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T06:20:59.266Z
---

**What.** The M1-11 command (src/core2/drives-economy.test.ts) on main b09ba675cd fails in Eden, Utah (seed 84cf76c0cb00caebe23ee4b3b06dd9c39cd2a5840a5af4b16f93f26a5401edbc): 'forms ambitions at the displaced-worker rate' saw 27.2% prove-oneself against a ceiling of 25%. The other three drives tests pass. Find whether the drive weights or the town's sample push the share up, and fix the cause rather than the bound.

**Rules.** No dice: each displaced worker forms a drive from their own traits, money and situation; the researched rate checks the town's total. One rule, all 56 places: the share holds in any drawn place.

**Done when.** The M1-11 command passes in Eden, Utah (seed above) and in three more places drawn from all 56 with seeds the builder did not choose, each named with its prove-oneself and carry-on shares in the PR body.

**Files.** src/core2/drives-economy.test.ts, src/core2/modules/drives.ts

**Notes.** Found by the M0-M2 lead's baseline run, Oct 24. Blocks roadmap M1-11.
