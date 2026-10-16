---
id: gov-committee-markup-trades
title: "Committee markup trades: members trade votes for sections in committee"
area: gov
kind: feature
priority: 2
status: done
claimed-by: claude/gov-committee-markup-trades
pr: #4539
blocked-on:
milestone:
source: "overnight pool item 1"
claimed-at: 2026-10-15T23:31:33.099Z
---

**What.** Members trade votes for sections in a bill on the floor today (#4281, as of 2026-10-15), but most bills die in committee, where nothing is traded. Build the committee markup: members of a committee trade support for sections, amendments and later votes, each deciding from their traits, relationships and the law in force, and the trade is recorded with both sides' reasons. The player would notice a bill's sections changing in committee and being told who traded what, instead of a bill that simply passes or dies.

**Rules.** No dice: no roll decides a trade; each member weighs traits, relationships, the interest groups reaching them and the law in force; Ask why: each side of every trade keeps its reasons, so 'why did the section change' has an answer by record id; The chain is the acceptance: follow one section from the markup trade to the law in force, the payment or rule it changed, and a person it reached; An effect is a read, not a record: later floor votes read the trades as obligations; One rule, all 56 places: committee structure comes from `src/core2/data/legislature/committees.json`, with no body named in code; Replace, never layer: any stand-in committee pass-through is deleted in the same change; One model, two tiers: a counted group's interest enters the member's reasons by the same rule as a named constituent.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a committee markup in the year shows a trade with both members' reasons by record id, the changed section on the bill, and a later floor vote that cites the trade. Tests in `src/core2/legislature-committees.test.ts` (new) for a trade made, refused, and a floor vote that honors it. The owner plays it: proposes an ordinance, watches the committee amend it, and reads who traded.

**Files.** src/core2/modules/legislature.ts, src/core2/legislature-committees.ts, src/core2/data/legislature/committees.json

**Notes.** Rewritten to the quality gate 2026-10-15.
