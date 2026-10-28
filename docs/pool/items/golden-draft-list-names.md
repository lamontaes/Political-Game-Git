---
id: golden-draft-list-names
title: "The draft list shows budget lines by internal key: Spending: healthAndHospitals"
area: play
kind: bug
priority: 1
size: S
status: claimed
claimed-by: golden/draft-list-names
pr:
blocked-on:
source: golden-path playthrough, Oct 28
lead: play-first
milestone: play-first
---

**What.** On Your office, the list of what the player can draft (golden path step 6, propose an ordinance) names each budget line as "Spending: healthAndHospitals", "Spending: welfareAndMedicaid", "Spending: naturalResources": the core catalog's internal key. The budgets screen already names the same lines from the source table ("Health and hospitals", "Public welfare"). Seen in Kenton, Oklahoma and Williamstown, Massachusetts.

**Rules.** No hand-written player text: the names come from the budgets data the budgets screen reads, one source for the fact, and no key reaches a player screen (player-screen-text).

**Done when.** The test src/bench/seat-catalog.test.ts, in a buildBenchWorld drawn place with its seed named, asserts that no budget line in a member's drafting menus has a colon or an internal camel-case key in its name; it fails on main and passes on the branch.

**Time box.** 1 hour.

**You will see.** The draft list reads "Health and hospitals" and "Public welfare".

**Screenshot.** None needed: the test reads the same menu rows the screen draws.

**Files.** src/bench/legislature.ts, src/bench/seat-catalog.test.ts
