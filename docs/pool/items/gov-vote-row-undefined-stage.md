---
id: gov-vote-row-undefined-stage
title: "A floor vote on a bill with a trade that names no stage throws 'Module data must be finite, acyclic JSON data'"
area: gov
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/vote-stage-undefined
pr: #4730
blocked-on:
source: "found running src/core2/legislature.test.ts on main, Oct 16"
---

**What.** After the change that makes the floor vote cite a member's trades, each vote row copies `{ kind, terms, stage }` from the bill's deals, and a deal made without a stage has `stage` undefined. Module rows refuse undefined, so the vote throws and the bill never passes or fails. On main the legislature test for a minimum wage ordinance failed on every run for this reason. The row now leaves the stage out when the trade names none.

**Rules.** No dice. An effect is a read: the floor vote still cites each trade the member took. Replace, never layer.

**Done when.** The legislature test file passes in full on a drawn place, including the minimum wage ordinance test that failed on main (it ran three times in a row and passed), and a vote on a bill with a stageless trade is a row that cites the trade by kind and terms.

**Files.** src/core2/modules/legislature.ts

**Notes.** Introduced by the commit that added `traded` to the vote row (committee trades, work in progress).
