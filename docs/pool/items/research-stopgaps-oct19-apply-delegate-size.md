---
id: research-stopgaps-oct19-apply-delegate-size
title: "Territory delegate races count voters from their 2024 race and registered voters"
area: core
kind: stopgap
priority: 3
size: S
status: in-pr
claimed-by: claude/apply-stopgaps-c2
pr: #5478
blocked-on:
milestone:
source: "data/research/stopgaps-oct19/C-government-law.json"
claimed-at: 2026-10-20T03:33:04.306Z
lead: researcher
---

**What.** The one row SG-GOV-delegate-race-size of the Oct 19 stopgap research: the delegate and resident commissioner races of Puerto Rico, Guam, the Virgin Islands and the Northern Mariana Islands count voters (their certified 2024 votes and EAC EAVS 2024 registered voters, in `delegate-races-2024.json`) instead of being sized by no voters. American Samoa's race has no two-party lean on record and counts none.

**Done when.** In a one-year-window played world (`buildBenchWorld`, a place drawn from all 56, every module installed, seed named), each applicable territory delegate seat (the complete seat-id set, accounting for the town's own territory race) appears in the November races with positive counted votes and a winner on the side of its counted share, and a negative that restores the zero electorate fails that same assertion; the stopgap stays open with revised text, since registered voters stand in for eligible citizens.

**Files.** src/core2/modules/world-races.ts, src/core2/data/elections/delegate-races-2024.json, src/core2/world-races.test.ts

**Notes.** A bounded slice of research-stopgaps-oct19-apply, which stays open for the other rows (merger send-back of Oct 26). A territory delegate's serving term is not written by the races yet; the race record is the downstream read.
