---
id: gov-redistricting-who-draws
title: "Whoever the state's law names (legislature, commission, council) chooses among printed plans, with reasons"
area: gov
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: gov-redistricting-plan-builder
source: added with npm run pool -- add
---

**What.** Read who holds the pen from the independent-redistricting law in force (government-operations.independent-redistricting, real answers in data/research/laws/starting-law-2026.json) and have that body choose among the printed plans with recorded reasons; the same world with a commission and with a legislature produces different maps. Resolves stopgap SG-GOV-REACH-A-redistricting once the engine reads the law.

**Rules.** No dice; one rule, all 56 places; no race, ethnicity or language field on any person; an effect is a read; the Political Process baseline and golden path come first, so this is not needed for early access play (docs/roadmap/political-process-baseline.md does not list redistricting; owner D-6 and Sept 28 #8 ask for it).

**Done when.** In a drawn place, the legislature or commission per that state's law chooses among printed plans with reasons by record id; changing the law changes who draws; the stopgap row is resolved.

**Files.** src/core2/modules/ (new), src/core2/data/laws/reach-group-a.json, src/core2/data/stopgaps.json

**Notes.** Split Oct 19 (claude/peaceful-ritchie-03780x) from gov-redistricting-engine using the parts of docs/codex/specs/bank/b16-redistricting-vra.md (old-core file references; port only what is used). The spec's open question for the owner (how many plans a legislator sees: 3 to 4 ready-made plans is recommended) is built as the recommended answer unless he rules otherwise.
