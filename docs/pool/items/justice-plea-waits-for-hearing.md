---
id: justice-plea-waits-for-hearing
title: "A charged defendant who pleads waits for the hearing under the pretrial rule, and a full prosecutor's desk still charges strong cases"
area: gov
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On main a defendant who pleaded guilty was convicted on the day of the charge (src/core2/modules/justice.ts chargeDecision), before the pretrial decision, so nobody who pleaded ever waited on bail, in jail or at home. The time to disposition the game already uses counts pleas, so a plea should wait for it as a trial does. Once pleaded cases stay open until their hearing, the prosecutor's workload weight had no cap and a desk at twice capacity weighed twice, so officials who took a bribe were no longer charged; the parameter's own definition says a strong case on a busy desk is still pursued. Two justice tests also drew a place and built a different one.

**Rules.** Sliding scales and causes: the workload weighs fully at a full desk and no more, as its parameter says, never a hard cutoff. One rule, all 56 places: the hearing waits the place's own time to disposition from its research row, and tests build the place they draw. No dice: the plea, the pretrial decision and the charge come from the recorded reasons, never a roll.

**Done when.** On the day of a charge each charged defendant is still charged and held under the pretrial rule, with at least one who pleaded, and the plea is entered at the hearing (src/core2/justice-pretrial.test.ts, failing with the same-day conviction put back). The forfeiture test convicts officials who took a bribe with the workload capped, and fails without the cap. A played year with the bribe offers forced as a fixture shows a posted bail's journal entry ids out of the person's account and back at the hearing (src/core2/justice-bail-year.test.ts). The justice tests pass.

**Files.** src/core2/modules/justice.ts, src/core2/justice-pretrial.ts, src/core2/justice-pretrial.test.ts, src/core2/justice-witness.test.ts, src/core2/justice-bail-year.test.ts, src/core2/justice-forfeiture.test.ts

**Notes.** TODO
