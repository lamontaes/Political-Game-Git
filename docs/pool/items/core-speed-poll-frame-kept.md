---
id: core-speed-poll-frame-kept
title: "A campaign poll reads the town's counted adults from a frame kept for the day, not rebuilt and sorted per poll"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** commissionPoll builds the whole town's frame (every full adult and every counted adult, sorted by id) for each poll; in Gunnison UT's election year polls cost 5 s. Keep the counted part, sorted, for the day and the counted store's version, and merge the full adults in id order.

**Rules.** Exact: the records proof is identical (speed-work). No dice. A cache keyed on everything it reads, registered as a derived cache.

**Done when.** speed:year on Gunnison, Utah (key 4932660, seed n8f6), four years, on main and the branch on the same commit gives identical fingerprints every year, with both receipts' times in the PR body.

**Files.** src/core2/modules/campaigns.ts

**Notes.** TODO
