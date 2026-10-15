---
id: gov-record-defects-finish
title: "Finish #4343: three officeholder record fixes"
area: gov
kind: bug
priority: 1
status: open
claimed-by:
pr: #4343
blocked-on:
milestone:
source: "reissue item 11; PR #4343 branch gov/session-c-record-defects"
---

**What.** (a) A sitting member of Congress who wins a council seat loses the House seat because incompatibility.json marks every place multipleElectiveOffices false and enforceIncompatibility acts on it; the bar must come from each place's own law in data, and the filing side must read the officeholder's situation, not a flat penalty. (b) BillRow.title and the new incompatibilities table need a reader in play. (c) bodyOf picks the first office row starting with us-house, which in D.C. and the territories is the delegate row; read the body kind from the seat's own record.

**Rules.** One rule, all 56 places; an effect is a read; ask why.

**Done when.** Orem, Utah seed fed-filing-1 no longer loses the House seat; a passed bill shows its title in play; a D.C. body reads its own kind.

**Files.** src/core2/modules/incompatibility*, legislature.ts, data/incompatibility.json

**Notes.** Defects 1, 2 and 5 are good as they stand. The "bill with no title" defect (batch 11, Pine Ridge 2027-2) is fixed when this merges.
Sent back 2026-10-15 from PR #4343 (branch gov/session-c-record-defects): code conflict with main in src/core2/modules/legislature.ts, scripts/dialogue-batch/coverage-batch.ts, stopgaps.json; finish on that branch, merge main into it first.
