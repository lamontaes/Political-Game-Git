---
id: people-births-ready-couples-conceive-at-once-part-4-age-shape-by-place
title: "A mother's age weighs against her own place's fertility schedule"
area: people
kind: bug
priority: 3
size: S
status: dropped
standard: 2
claimed-by:
pr:
after: people-births-ready-couples-conceive-at-once-part-1-re-measure
blocked-on:
lead: lives
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: split from people-births-ready-couples-conceive-at-once in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Births by age band follow the plan score's narrow age peak: ages 25 to 29 run about 5 times the CDC count and ages 35 to 44 run near zero, while the total is right. The plan weighs a mother's age against one schedule instead of her own place's NCHS schedule. Each couple's plan record should carry the age center and spread of its own place.

**Cause.** Found in code: src/core2/births-plan.ts (the age term of the plan score in chooseBirthPlan, line 270) uses one age center and spread; per-place NCHS schedules are in data/research/renewal/natality-2024.json.

**Fix.** Read the age center and spread from the couple's own place's NCHS schedule in the plan score, and write them on the plan record.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the age schedule is place data. No dice: the age term is a sliding scale. Research before building: the schedule is quoted from the file, not typed. Replace, never layer: the single age center is removed.

**Done when.** A second session runs a one-year played world (buildBenchWorld) in two drawn places with different schedules (named, with seeds) and sees each full couple's plan record carry its own place's age center and spread, with the same couple's age term different between the two places in src/core2/births-plan.test.ts. The town's mean age of mothers at birth is reported beside its place's NCHS schedule.

**Waits on.** people-births-ready-couples-conceive-at-once-part-1-re-measure.

**Files.** src/core2/births-plan.ts, src/core2/births-plan.test.ts, data/research/renewal/natality-2024.json

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have shaped births by mother's age band against each place's schedule; the total is right and no one sees the age bands.
