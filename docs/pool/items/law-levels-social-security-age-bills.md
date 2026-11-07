---
id: law-levels-social-security-age-bills
title: "Congress can amend the three Social Security age laws"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Three federal Social Security age rows exist in every opening world, but their bill controls are missing. Congress cannot reach those laws from the catalog even though 42 U.S.C. 1304 expressly reserves amendment and repeal to Congress. Add the three numeric age controls, sourced federal authority and bill wording through the existing law-amount path.

**Rules.** One rule, all 56 places: the same catalog and enactment engine reads each age as data. No dice or vote changes; preserve the existing cohort schedule until a real amendment supersedes it.

**Done when.** A generated-world test in a drawn place names replay and record ids, finds all three ages in Congress's catalog, refuses other levels, and follows a replacement age through the existing Social Security reader. A prior-value amendment restores the prior age. Distinguish changing an age law from abolishing the entire benefit program.

**Files.** src/core2/data/legislature/series-powers.json,scripts/research/build-bill-catalog.py,src/core2/data/legislature/bill-catalog.json,data/english/bill-sections.json,src/core2/social-security-age-bills.test.ts

**Notes.** Astra, Nov 7 all-starting-laws audit. Sources read: 42 USC 402(a), 402(w), 416(l), 1304. One-session scope, no helpers, two-hour time box. Congress authority only; no new preemption doctrine.
