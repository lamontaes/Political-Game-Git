---
id: people-homeschool-share-recheck-shrinkage
title: "Re-check the homeschool state shares' shrinkage against the replicate-weight errors"
area: people
kind: research
priority: 3
size: S
status: done
claimed-by: claude/homeschool-error-bars
pr: #5608
blocked-on:
after: people-homeschool-share-by-state
source: added with npm run pool -- add
claimed-at: 2026-10-20T08:22:42.152Z
---

**What.** Compare the shrunk state homeschool shares with the replicate-weight standard errors in docs/reports/homeschool-share-error-bars-2026-10-20.md and say whether the pull of 40 household records is large enough.

**Rules.** estimate-not-unknown: a state share starts from the real average with a per-world spread, marked ESTIMATED with its source.

**Done when.** A short note in docs/reports gives for each state whether its shrunk share sits inside one standard error of the national share, a drawn place and the table row, and the pull value kept or changed with the reason.

**Files.** docs/reports/homeschool-share-error-bars-2026-10-20.md

**Notes.** TODO
