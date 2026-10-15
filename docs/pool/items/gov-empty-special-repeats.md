---
id: gov-empty-special-repeats
title: "An empty race resolves by its law: holdover, or another special, read from data"
area: gov
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on: gov-holdover-rule-data
milestone:
source: "split from gov-empty-race-holdover"
---

**What.** When a count has no candidate with votes (`holdElection` in voting.ts leaves `winnerId` null and opens the next cycle), the seat's holder today stays only by accident of the term record. Read the holdover rule for the place and office: the holder serves until a successor qualifies, or the vacancy rule runs again as a new special election. Repeated empty specials follow the vacancy rule each time and are recorded.

**Rules.** Replace, never layer; no dice; the chain is the acceptance; no hand-written player text; one rule, all 56 places.

**Done when.** In a drawn place an empty regular race and an empty special each resolve by the data rule and leave a record (term kept with its reason, or a new vacancy and special), named by id in a played-world year; the tests prove both branches.

**Files.** src/core2/modules/voting.ts, src/core2/modules/offices.ts, src/core2/modules/elections.ts

**Notes.** Touches the same code as #4343; start after it merges.
