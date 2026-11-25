---
id: laws-benefit-amounts-paid-at-the-treasury-close
title: "SSI, child care and energy assistance are paid from the law in force at the treasury's monthly close"
area: laws
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: laws-and-effects (builder crew, Nov 17)
pr: #9898
after:
blocked-on:
lead: laws-effects
source: Laws and effects lane, crew line #9747 items 8c and 8f, Nov 17, 2026 (grading the rows the Nov 14 table never ran)
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** The three benefits whose amount or income limit is the law's own value (SSI's federal benefit rate, the child care income limit, the home energy assistance income limit) are re-run on law reach's own monthly review, a month from the day they opened, not when the treasury pays. Every other benefit program (Medicaid, SNAP, the welfare line, preschool, vouchers) is run by the treasury's monthly close. The law table grades the three rows partly: "only law reach's own handler reads it; no engine reads the law at the moment it decides or pays". Seen: docs/reports/law-wiring-table.md, the three rows, graded at Paintsville, Kentucky (seed a4e2c7a0) on Nov 17.

**Cause.** Found in code: `PROGRAM_KEYS` in src/core2/law-reach/group-b.ts lists the programs `runBenefitPrograms` runs at the treasury's close (`registerMonthlyProgram`, src/core2/modules/budgets.ts); the three standing benefits opened by src/core2/law-reach/host.ts are not in it, so `review` re-runs them from the law reach module's own calendar.

**Fix.** The three join `PROGRAM_KEYS` through one list kept beside the reach store (`STANDING_BENEFIT_PROGRAMS`, src/core2/law-reach/group-b-store.ts), which the host also opens them from.

**Time box.** 1 hour for one Opus session at medium effort.

**Rules.** An effect is a read, not a record: the treasury reads the law in force at the moment it pays, so a change reaches people when they are paid.

**Done when.** A second session, in a drawn place, Town, State (seed printed), passes a Congress bill raising SSI's federal benefit rate in dev mode, runs past the next monthly close, and reads on the bill card the SSI recipients reached; `src/core2/benefits-paid-at-the-close.test.ts` passes in that drawn place.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b.ts, src/core2/law-reach/group-b-store.ts, src/core2/law-reach/host.ts, src/core2/benefits-paid-at-the-close.test.ts (new)
