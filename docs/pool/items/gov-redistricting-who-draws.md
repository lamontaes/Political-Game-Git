---
id: gov-redistricting-who-draws
title: "Whoever the state's law names (legislature, commission, council) chooses among printed plans, with reasons"
area: gov
kind: feature
priority: 3
size: M
status: claimed
claimed-by: claude/peaceful-ritchie-03780x
pr:
blocked-on:
after: gov-redistricting-plan-builder
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:36:12.479Z
---

**What.** Read who holds the pen from the independent-redistricting law in force (government-operations.independent-redistricting, real answers in data/research/laws/starting-law-2026.json) and have that body choose among the printed plans with recorded reasons; the same world with a commission and with a legislature produces different maps. Resolves stopgap SG-GOV-REACH-A-redistricting once the engine reads the law.

**Rules.** No dice; one rule, all 56 places; no race, ethnicity or language field on any person; an effect is a read; the Political Process baseline and golden path come first, so this is not needed for early access play (docs/roadmap/political-process-baseline.md does not list redistricting; owner D-6 and Sept 28 #8 ask for it).

**Done when.** In a drawn place, the legislature or commission per that state's law chooses among printed plans with reasons by record id; changing the law changes who draws; the stopgap row is resolved.

**Files.** src/core2/modules/ (new), src/core2/data/laws/reach-group-a.json, src/core2/data/stopgaps.json

**Notes.** Split Oct 19 (claude/peaceful-ritchie-03780x) from gov-redistricting-engine using the parts of docs/codex/specs/bank/b16-redistricting-vra.md (old-core file references; port only what is used). The spec's open question for the owner (how many plans a legislator sees: 3 to 4 ready-made plans is recommended) is built as the recommended answer unless he rules otherwise.

Built Oct 20 (claude/peaceful-ritchie-03780x), in src/core2/redistricting-authority.ts. `whoDraws` / `whoDrawsIn` read the independent-redistricting law in force at the state or local level (a value of 1 at that level, not set aside, means an independent commission; otherwise the legislature or council) and return the law row id that put the pen in the commission's hands. `choosePlan(drawer, plans)` scores each printed plan from its measured facts (evenness against the level's limit, majority-minority districts, members paired, seats for the drawer's party, a breach of the population limit) with the weights for who is drawing (src/core2/data/redistricting/choice-weights.json: a commission gives party seats no weight, SOURCED to commission charters; a legislature weighs its party's seats and keeping its members apart; all others TUNABLE with a spread) and returns every plan's score with the reason each fact counted; ties go to the first plan id. src/core2/redistricting-authority.test.ts: a commission picks the even, Voting Rights Act plan; a legislature the plan that wins its party seats within the limit, scoring the over-limit plan down; every plan carries its five reasons; and in a drawn place (buildBenchWorld, state level) changing the law row flips who draws from legislature to commission and back. Left on this item: the choice happens inside the legislature or commission with its real members and votes, through the existing vote and bargaining surfaces (the spec's open question: 3 to 4 printed plans to pick and bargain over), so a legislature's majority party and members' homes come from the live world; the stopgap SG-GOV-REACH-A-redistricting stays open until the engine reads the law in play and the lines change. Needs the plan builder's live inputs (votes by block group, members' homes).
