---
id: law-levels-pending-law-reversal
title: "A new act can change a pending law and its effective date"
area: laws
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: astra/scheduled-law-reversal
pr: #7323
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-07T20:30:43.004Z
---

**What.** The played Hamburg probe passed a town bill effective January 22, but enactment discarded its section as restates-pending because an earlier bill was scheduled for February 20. The law reader also ranks enacted rows by effective date before enactment order, so an older pending phase can undo a later repeal. Make later acts replace older acts while retaining the dated phases within each act.

**Rules.** One law system: share the ordering rule between law-in-force selection and the drafting reader. Dates are law data, not dice or fixed outcomes. Preserve all existing tests and the State Sessions boundaries.

**Done when.** A generated-world test draws a place and prints replay and record ids. An earlier effective date is a real change, a later repeal survives the old pending phase, and phases within one act still follow their dates. The actual vote probe is reported separately.

**Files.** src/core2/laws-in-force.ts,src/core2/modules/laws.ts,src/core2/modules/legislature.ts,src/core2/pending-law-reversal.test.ts

**Notes.** Observed in Hamburg, New Jersey, replay 8d5e52aae98296b1; town bill recorded as overridden but with zero new law rows and a restates-pending record.
