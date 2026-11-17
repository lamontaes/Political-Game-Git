---
id: pins-27-law-reach-from-people
title: "Pins family 27: a law's reach comes from the people it reaches (take-up, counted veterans, pay shares, owners' hours, school aid need)"
area: laws
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by: pins
pr:
after:
blocked-on:
root: none
lead: pins
model: opus
effort: high
source: "CTO, LIFT THE PINS, #9747 comments 6936897718 and 6936903167 (family 27, moved to Pins by Laws and effects 6937865102); Pins plan 6938593892"
---

**What.** A law's reach was set by published shares in every world: five benefits paid every eligible household the benefit times a survey take-up share, counted veterans were the census share by age, and a budget change became pay at a fixed share. Seen: the CTO's audit of main c5808caa, family 27.

**Cause.** Found in code: `payPreschool`, `payChildCare`, `payEnergyAssistance` and `paySsi` in src/core2/law-reach/group-b-money.ts and `payVeterans` in src/core2/law-reach/group-b-veterans.ts read take-up shares; `scalePayroll` read schoolCompensationShare and healthCompensationShare; `placesFacts` in src/core2/law-reach/group-b-people.ts read ownerWeeklyHours; `schoolAidNeed` in src/core2/law-reach/group-b-school-aid.ts read BEA income.

**Fix.** Each eligible household takes a benefit up by `takesUp` (the unemployment filing case, `filingDecision`, with the benefit over its own income and its own fitted base). Counted veterans follow the full residents' own served share by age. The pay share is the line's payroll over its base spending on the books. Owners' hours follow their staff's week. School aid need reads the world's regional pay (`stateRegionsNow`). The player sees it in dev mode's laws on a person's card and the Trace box.

**Time box.** 6 hours, Opus, high.

**Rules.** One model, two tiers: counted households take a benefit up by the same rule as named heads, times their weight. Sliding scales and causes: take-up moves smoothly with the benefit against income, never at a threshold.

**Done when.** A second session plays a year in a drawn place it names with its seed, with dev mode on and child care aid set through the Bills panel, and sees households in the lowest income fifth take energy and child care aid up while richer ones leave it.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/law-reach/group-b-veterans.ts, src/core2/law-reach/group-b-people.ts, src/core2/law-reach/group-b-school-aid.ts, src/core2/law-reach/group-b.ts, src/core2/jobs-benefits.ts, src/core2/modules/regional.ts, src/core2/law-reach/take-up-own-case.test.ts, scripts/core2-year/pins-27-proof.ts.
