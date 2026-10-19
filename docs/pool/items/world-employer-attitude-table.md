---
id: world-employer-attitude-table
title: "A sourced table of employer callback gaps by group, with a spread per place"
area: world
kind: research
priority: 2
size: M
status: claimed
claimed-by: claude/employer-attitude
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:11:32.711Z
---

**What.** A sourced table of how much less often an employer calls back an applicant of a group than an identical applicant of the reference group, for Black and Latino applicants, older applicants and applicants with a criminal record. Each row carries a ratio with a spread, a source and a SOURCED or ESTIMATED tag; the spread between employers comes from the 108-employer audit. The table is the input a hiring engine needs before a discrimination ban has anything to refuse, and it only sets totals and a per-employer spread, never one employer's answer.

**Rules.** Research before building: real data calibrates totals and never decides one employer's outcome (no dice). Estimate, never UNKNOWN: a row with no place study says so and is marked ESTIMATED with its source. One rule, all 56 places: the table names no place; place spread is drawn per world.

**Done when.** `src/core2/employer-callback-gaps.test.ts` passes: every group has a reference, a ratio inside its spread, an https source and a tag. The reader that uses it is the item world-sale-eligibility-reads, which turns an employer's own traits and the gap into who is passed over; this item adds data only.

**Files.** src/core2/data/jobs/employer-callback-gaps.json, src/core2/employer-callback-gaps.test.ts

**Notes.** Oct 19. Verified against search results: Quillian et al. 2017 (1.36 and 1.24), Kline, Rose and Walters 2022 (2.1 points, between-firm SD 1.9), Bertrand and Mullainathan 2004 (50% more). Older applicants (press summary) and Pager 2003 (no-record rates not confirmed) are ESTIMATED until read from the papers. Nothing reads the table yet, so it is data for world-sale-eligibility-reads, not a placeholder in play.
