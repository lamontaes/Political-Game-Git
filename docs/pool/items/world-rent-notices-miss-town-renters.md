---
id: world-rent-notices-miss-town-renters
title: "Rent notices go to households outside the played town, so a town's renters almost never get one"
area: world
kind: bug
priority: 1
size: M
status: open
standard: 2
root: none
claimed-by:
pr:
after:
blocked-on:
lead: m0-m2
source: "Civic roles builder, Nov 16, tracing why no resident with a rent notice came to office hours in 12 played towns (the Account lead asked for the trace and the item)"
model: opus
effort: medium
---

**What.** At Seneca Falls, New York (3666322, seed 9400254d4470958138634662aaf682c6831def49665a94b5bc1115cfe0bcee95), 13 of 14 housing cases in 120 days were on full households that live outside the town, and the one in-town case was past the notice stage. Six more drawn towns (Darden TN, Randolph ME, Prompton PA, Robbins NC and two more) had no in-town notice in 240 days. Over 150 days at Seneca Falls the town held about 1,100 counted renting households, 2 to 5 of their groups in arrears and 2 to 4 counted leases late each month, against about 30 in-town full leases and about 290 full leases outside the town, 10 to 15 of them in arrears. Seen: no renter in the played town is ever told to pay or leave, no resident brings a rent notice to office hours, and the paper has no evictions to print.

**Cause.** Found in code: the monthly housing step in src/core2/modules/housing.ts (the loop before `landlordPulls`, about line 1770) weighs every late lease in the world, including the full households that live outside the played town, together with the town's counted late leases from `countedLate` (src/core2/housing-homeless.ts). `landlordPulls` (housing.ts, about line 1898) serves floor(sum of sigmoid scores) notices a month, highest score first. Full households outside the town owe more months, so they take nearly every notice and the town's counted renters rarely reach one. Separately, `bringCases` in src/core2/modules/constituent-cases.ts reads rent notices only for full residents; a counted resident with a notice never brings a case. Its counted path covers only people out of work, so a rent case is a rule for full people alone.

**Fix.** Weigh a place's late leases among that place's own: the notice count comes from each place's own late leases, so the town's counted renters and the households elsewhere each draw from their own pull, by the same rule. Give counted residents with an open rent case the same bring-a-case path the counted out-of-work have. Trace before building; the renters thread owns this code.

**Time box.** 3 hours, one Opus session at medium effort.

**Rules.** One model, two tiers: a counted renter is weighed by the same rule as a full one, times its count. One rule, all 56 places. No dice: the pull is the landlord's reasons, never a draw.

**Done when.** At Seneca Falls (seed above) and at a drawn place with a seed nobody chose, a played year shows in-town notices on counted and full renters at a rate near the place's own late leases, by housing case id, and at least one in-town resident with a rent notice brings it to office hours. In dev mode, a second session opens a renter's housing case and sees why the notice was served (months owed, days late, its score against the month's pull), and opens a resident with a problem and sees why they did or did not bring it to office hours (the problem, its severity, the lean and who they would go to). Today dev mode's trace shows neither: it has no read of the landlord's pull or of the bring-a-case lean.

**Waits on.** Nothing.

**Files.** src/core2/modules/housing.ts, src/core2/housing-homeless.ts, src/core2/modules/constituent-cases.ts, src/bench/dev-trace.ts

**Notes.** Filed by hand by the civic roles builder, Nov 16. Trace script /tmp/claude-0/s/oh/trace-rent.mts (the counts above).
