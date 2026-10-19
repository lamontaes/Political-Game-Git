---
id: gov-empty-race-holdover
title: "Empty races: state holdover rules, repeated empty specials, a failed presidential election"
area: gov
kind: feature
priority: 1
status: done
claimed-by:
pr: #4426
blocked-on:
milestone:
source: "reissue item 12 (Session C leftovers)"
---

**What.** Register and build what the place's law says when a race is empty: state holdover rules, repeated empty special elections, a presidential election that fails to elect. Also check the three loose commits on gov/state-federal (a counted-gift cap, batched counted minimum-wage raises, a residency weigh-down) against main, carry forward what is not there, then let the branch go.

**Rules.** AGENTS.md: replace, never layer; registered stopgaps; no hand-written player text; one rule, all 56 places.

**Done when.** An empty race in a drawn place resolves by its law from data and is recorded; the carried commits are on main or noted dropped.

**Files.** src/core2/modules/elections.ts, candidacy.ts

**Notes.** Split Oct 15 by a Claude session into gov-holdover-rule-data, gov-empty-special-repeats and gov-failed-presidential-election. The three loose commits on gov/state-federal, checked against main: the counted-gift cap and the batched minimum-wage raise were not on main and are carried in the PR that split this item; the residency weigh-down edits the wide-race candidate pool (raceScope, standingPool) that main does not have, so it waits for the wide-race merge (gov-wide-races-merge, #4350) and is not carried here: after that merges, cherry-pick aa7b45bef0 from gov/state-federal or note it dropped.
