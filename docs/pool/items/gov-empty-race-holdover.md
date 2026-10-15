---
id: gov-empty-race-holdover
title: "Empty races: state holdover rules, repeated empty specials, a failed presidential election"
area: gov
kind: feature
priority: 1
status: blocked
claimed-by:
pr:
blocked-on: gov-wide-races-merge
milestone:
source: "reissue item 12 (Session C leftovers)"
---

**What.** Register and build what the place's law says when a race is empty: state holdover rules, repeated empty special elections, a presidential election that fails to elect. Also check the three loose commits on gov/state-federal (a counted-gift cap, batched counted minimum-wage raises, a residency weigh-down) against main, carry forward what is not there, then let the branch go.

**Rules.** AGENTS.md: replace, never layer; registered stopgaps; no hand-written player text; one rule, all 56 places.

**Done when.** An empty race in a drawn place resolves by its law from data and is recorded; the carried commits are on main or noted dropped.

**Files.** src/core2/modules/elections.ts, candidacy.ts

**Notes.** (Oct 15) Blocked on #4350 (`gov-wide-races-merge`): it adds the empty-race record (`emptyRaces` table, `resolveEmptyRace` in voting.ts, `src/core2/data/elections/empty-races.json`, stopgap SG-GOV-empty-race-law with one estimated holdover default for every state and local race). This item replaces that default with each place's own law, adds the repeated-empty-special and failed-presidential-election cases on that record, and checks the three loose commits on `gov/state-federal` (0c3c7fdf counted-gift cap, 32138505 batched counted minimum-wage raises, aa7b45be residency weigh-down) against main. Build it after #4350 merges, on that record; do not build a second empty-race record.
