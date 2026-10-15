---
id: core-moves-pinned-and-income-stopgaps
title: "Movers with a pinned job or a household income award can leave (two stopgap rows in moves)"
area: core
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "split from core-stopgap-moves-faked-mechanic"
---

**What.** Two stopgap rows in `src/core2/modules/moves.ts` still keep people from leaving town. SG-P15-moves-pinned-jobs: a person whose job a saved agreement names as its provider's qualification (a visitor's lodging, a public supplier contract) never moves, because the core rejects the agreement's next payment once the job ends. SG-FIXER-moves-income-household: a person whose recorded income award (a pension, Social Security) is paid into a household that others stay in never moves, because the award names the household it is paid into. Replace both: an agreement re-resolves its qualifying worker when a job ends, and an income award follows its person to their new household with its own dated record.

**Rules.** Replace, never layer: the two blocks in `decide` and the rows are deleted in the same change. An effect is a read: the award's next payment reaches the person in the new household, shown on the ledger. The chain is the acceptance: follow one pension from the old household to the new one by record id. One rule, all 56 places.

**Done when.** In a one-year played world (`buildBenchWorld`) in a drawn place, a person with a pension and a person whose job a saved agreement names each leave, and the award's payment and the agreement's payment continue without a rejected payment, named by record id; the tests in `src/core2/moves.test.ts` and the stopgap tripwire test pass with both rows removed from `stopgaps.json`.

**Files.** src/core2/modules/moves.ts, src/core2/data/stopgaps.json, src/core2/state.ts (the award and agreement calls)

**Notes.** Split from core-stopgap-moves-faked-mechanic when its first row (owners stay) was replaced by a home sale in PR for claude/core-stopgap-moves.
