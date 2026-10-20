---
id: release-stale-claims-two-days
title: "Claims from Oct 18 have a branch with commits and no PR for two days: nobody else can take them"
area: release
kind: bug
priority: 3
size: S
status: claimed
claimed-by: claude/stale-claims-s16
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:42:34.942Z
---

**What.** world-corporate-office-staff-never-paid, world-home-turnover, core-old-imports-opening-work and world-worker-unpaid-four-months were claimed on Oct 18 and their branches (claude/corporate-office-staff-paid, claude/home-turnover-split, claude/old-imports-opening-work, claude/worker-unpaid-four-months) hold 2 to 4 commits each, but no PR was opened and the claims block other builders while the pool is nearly empty. The CTO decides whether each is released for a fresh session to finish on its branch (as was done for PR #5302) or left to its builder.

**Rules.** Never push to another session's branch without the CTO releasing the claim; the claim command refuses an item that is not open.

**Done when.** For each of the four items the CTO either sets it open with the branch named in Notes or records that its builder is still working; shown by the four item files and docs/pool/INDEX.md, no test needed.

**Files.** docs/pool/items/world-corporate-office-staff-never-paid.md, docs/pool/items/world-home-turnover.md, docs/pool/items/core-old-imports-opening-work.md, docs/pool/items/world-worker-unpaid-four-months.md

**Notes.** TODO
