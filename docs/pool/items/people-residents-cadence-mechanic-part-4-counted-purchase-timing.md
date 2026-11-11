---
id: people-residents-cadence-mechanic-part-4-counted-purchase-timing
title: "Counted purchases follow each group's pay dates"
area: people
kind: feature
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after: people-residents-cadence-mechanic-part-3-counted-absence
blocked-on:
lead: lives
model: opus
effort: high
root: design-one-model-two-tiers
source: split from people-residents-cadence-mechanic in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** The wider population's purchases merge per seller, kind and week of the month and are paid monthly, instead of following each group's own pay dates. Build counted purchases timed from each group's own pay dates, and resolve SG-CORE-residents-cadence.

**Cause.** Found in code: SG-CORE-residents-cadence (RESIDENTS_STOPGAP, src/core2/residents.ts line 49; row in src/core2/data/stopgaps/core.json): the wider population's purchases merge per seller, kind and week of the month and are paid monthly, and counted workers always work their full schedule.

**Fix.** Time counted purchases from each counted group's pay dates, and mark SG-CORE-residents-cadence resolved naming the reader.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted group follows the same rule as a full person, times its count. No dice: absence and layoffs follow a worker's own record and the employer's books; real rates check totals only. Every dollar balances. Speed: the speed guard holds, with no scan of the whole world each day.

**Done when.** A second session runs a one-year played world (buildBenchWorld) in a drawn place (place and seed named) and sees counted purchases land on dates that follow each group's pay dates, by purchase record ids, with every dollar balancing, and SG-CORE-residents-cadence resolved in src/core2/data/stopgaps/core.json.

**Waits on.** people-residents-cadence-mechanic-part-3-counted-absence.

**Files.** src/core2/residents.ts, src/core2/modules/residents.ts, src/core2/data/stopgaps/core.json

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have timed the wider population's purchases to its pay dates; no player sees the week a purchase is made.
