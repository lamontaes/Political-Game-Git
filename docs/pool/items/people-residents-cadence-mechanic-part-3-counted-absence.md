---
id: people-residents-cadence-mechanic-part-3-counted-absence
title: "Counted workers miss work for the same reasons as full workers, times their count"
area: people
kind: feature
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after: people-residents-cadence-mechanic-part-1-private-jobs-measure
blocked-on:
lead: lives
model: opus
effort: high
root: design-one-model-two-tiers
source: split from people-residents-cadence-mechanic in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Counted workers always work their full schedule, while full workers miss work for their own health, household and job (src/core2/work-attendance.ts). Counted absence needs inputs counted records do not hold today (needs, pay dates per member), and a counted record's strain is zero. Give counted workers the same reasons as full workers, times their count.

**Cause.** Found in code: SG-CORE-residents-cadence (RESIDENTS_STOPGAP, src/core2/residents.ts line 49; row in src/core2/data/stopgaps/core.json): the wider population's purchases merge per seller, kind and week of the month and are paid monthly, and counted workers always work their full schedule.

**Fix.** Give counted groups the inputs absence needs (health need, household need) and apply the full workers' absence reasons times the count, so counted workers miss shifts.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted group follows the same rule as a full person, times its count. No dice: absence and layoffs follow a worker's own record and the employer's books; real rates check totals only. Every dollar balances. Speed: the speed guard holds, with no scan of the whole world each day.

**Done when.** A second session runs a one-year played world (buildBenchWorld) in a drawn place (place and seed named) and sees counted workers miss shifts for recorded reasons, by absence record ids, with the absence rate reported beside the CPS figures on a comparable measure.

**Waits on.** people-residents-cadence-mechanic-part-1-private-jobs-measure.

**Files.** src/core2/work-attendance.ts, src/core2/residents.ts, src/core2/modules/residents.ts

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have made counted workers miss work for their own reasons; no player sees a counted worker's absence.
