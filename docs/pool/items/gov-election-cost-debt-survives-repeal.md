---
id: gov-election-cost-debt-survives-repeal
title: "Repealing an election law stops new costs without forgiving unpaid election debt"
area: gov
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #5582
blocked-on:
source: added with npm run pool -- add
claimed-at: 
---

**What.** The returned government law family deactivates an election-cost debt when the law that incurred it is no longer in force. That happens before the code reads the amount owed or attempts settlement. Repeal must stop new ballot, identification or registration charges while leaving the already-incurred payable collectible from the treasury that owes it.

**Rules.** An effect is a read, not a record: the payable must still reach settlement and the cash journal after repeal. Sliding scales and causes: new costs depend on the current law, while old debt depends on the recorded obligation. Replace, never layer: use the existing debt settlement path.

**Done when.** A positive-debt regression incurs an election cost, repeals its law before payment, funds the owing treasury and proves the old payable is repaid to its original payee by journal record id without new post-repeal charges. A buildBenchWorld played-world case in a drawn place names the seed and law, debt and payment records; the changed-file checks pass.

**Files.** src/core2/law-reach/group-a-voting.ts, src/core2/law-wiring-government.test.ts

**Notes.** Sent back 2026-10-23 from PR #5582 (branch claude/law-wiring-government): group-a-voting.ts deactivates existing positive debt on repeal before settlement; finish on that branch, merge main into it first.
