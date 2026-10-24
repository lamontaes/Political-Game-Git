---
id: gov-election-cost-debt-survives-repeal
title: "Repealing an election law stops new costs without forgiving unpaid election debt"
area: gov
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/law-wiring-government
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

Sent back 2026-10-24 UTC from PR #5582 (branch claude/law-wiring-government): the body routes the ten-law family to nonexistent laws-nine-links-government and cites absent docs/work-orders/lead-laws-2026-10-24.md for the audit towns; publish the matching item and correct its evidence pointer, preserving the debt item and unfinished umbrella; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5582 (branch claude/law-wiring-government): PR held: family Done-when requires played years but committed evidence windows are 35/300 days; family pool id remains absent from main while #5858 is open, without claiming the repaired debt path failed; finish on that branch, merge main into it first.
