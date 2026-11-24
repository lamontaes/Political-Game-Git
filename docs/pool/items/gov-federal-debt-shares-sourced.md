---
id: gov-federal-debt-shares-sourced
title: "Replace the federal debt holder shares with the Treasury's OFS-2 readings and mark them SOURCED"
area: gov
kind: research
priority: 2
size: S
status: done
claimed-by: claude/gov-federal-debt-shares-sourced
pr: #4717
blocked-on:
source: "gov-outside-revenue-borrowing, PR #4484"
claimed-at: 2026-10-15T22:35:32.539Z
---

**What.** Replace the nine lender-group shares of the federal debt with the readings in the Treasury Bulletin's Ownership of Federal Securities table (OFS-2), and change their tag from ESTIMATED to SOURCED. The shares in the federal debt file were written without reading the table because the Treasury site could not be opened from the cloud session that wrote them. A session that can open the table reads the latest quarter, maps its rows onto the nine groups, and cites the table and quarter.

**Rules.** Estimate, never UNKNOWN: until read, the shares stay ESTIMATED with their spread. Every number lives in the parameter table, tagged SOURCED with citation. No dice: the shares set how a loan is split, never which lender a person picks.

**Done when.** The shares in src/core2/data/budgets/federal-debt.json carry the table's name and quarter and sum to one. The federal debt test (src/core2/federal-debt.test.ts) still passes in a random place and seed, and a one-year run of the played world (buildBenchWorld) still borrows from all nine groups, with the largest holder paid the most interest.

**Files.** src/core2/data/budgets/federal-debt.json, src/core2/federal-debt.test.ts

**Notes.** Added by the session that built gov-outside-revenue-borrowing (PR #4484). The group names may need to change to follow the table's rows.
