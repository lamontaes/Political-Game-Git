---
id: gov-stopgap-world-legislating-missing-mechanic
title: "Stopgaps in world-legislating (missing-mechanic): 1 open"
area: gov
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
after: gov-federal-questions-admitted
size: L
source: "src/core2/data/stopgaps.json, src/core2/modules/world-legislating.ts, kind missing-mechanic"
claimed-at:
---

**What.** Roll-up for SG-GOV-federal-proposal-coverage in src/core2/modules/world-legislating.ts. Background Congress files bills only from questions its level may take, and 25 of the powers catalog's 121 questions are federal-only (20 us-federal-positions plus 5 us-tax-terms:federal) but only a handful have a recorded answer (federal-answers.json lists 2) and only the federal minimum wage has a core2 effect reader. Split Oct 20 into gov-federal-questions-answers-stances (the standing answers and officials' stances), gov-federal-questions-money-readers (questions that move federal dollars), gov-federal-questions-rule-readers (questions that change who may do what) and gov-federal-questions-admitted (admit each question to Congress's pool only when all three exist and delete the api.stopgap call). Nothing is built under this item itself.

**Rules.** An effect is a read, not a record: no question enters Congress's pool until another engine reads its enacted answer. Replace, never layer: the part that admits the questions deletes the stopgap call and its marker. No dice: Congress files from members' reasons and the law in force. One rule, all 56 places: federal questions are data keyed by question and no state is named.

**Done when.** All four parts are done: in a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, background Congress files and passes a federal-only bill whose enacted law row is read by a named engine, shown by bill and law record ids in src/core2/world-legislating-federal.test.ts, and SG-GOV-federal-proposal-coverage is resolved in src/core2/data/stopgaps.json.

**Files.** docs/pool/items/gov-federal-questions-answers-stances.md, docs/pool/items/gov-federal-questions-money-readers.md, docs/pool/items/gov-federal-questions-rule-readers.md, docs/pool/items/gov-federal-questions-admitted.md

**Notes.** First row: Background Congress uses the shared platform question pool, which lacks most federal-only questions in the powers catalog. Only supported questions with federal scope can be proposed; state-specific questions no longer s

Oct 20 (pool feeder): spec written and split into four parts; most of the 25 questions are read only by the old core (src/simulation/federal-*.ts), which is not ported, so the parts rebuild their readers on core2 as modules and data rows and do not carry the old code over.
