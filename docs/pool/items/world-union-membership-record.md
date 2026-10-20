---
id: world-union-membership-record
title: "Union membership is a record on each member, by industry and state (BLS)"
area: world
kind: feature
priority: 3
size: M
status: claimed
claimed-by: claude/union-membership
pr: #5302
blocked-on:
source: split from core-stopgap-membership-dues-assumed-data, Oct 19
claimed-at: 2026-10-20T03:36:34.011Z
---

**What.** Record a union membership on each full person and counted worker group whose industry and state the BLS Union Members tables cover, so the count of members in a place is the sum of those records, not a rate times the employed. The records at the opening add up to the BLS rate for the industry and state, as a check, never as the per-person rule.

**Rules.** Wire to the world: dues and membership move real money and real people. One model, two tiers: counted workers join at their group's rate and a filled-in person matches it. No dice: nobody joins by a roll; pay, job and views decide. Numbers in the parameter table, tagged.

**Done when.** In a drawn place (name and seed in the PR body) buildBenchWorld has membership records whose sum by industry matches the BLS table within its spread, and src/core2/membership-dues.ts reads those records instead of the rate; shown by record id in src/core2/membership-dues.test.ts.

**Files.** src/core2/membership-dues.ts, src/core2/data/business/union-membership.json

**Notes.** Built in PR #5302 (simplest rule, flagged as SG-WORLD-business-union-members-rule; full members pay from own cash). Parent: core-stopgap-membership-dues-assumed-data. Today src/core2/membership-dues.ts takes members as the place's employed times the state's BLS rate and draws dues from pooled cash.
