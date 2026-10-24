---
id: jobs-counted-hire-other-employer-calendar
title: "A counted hire at a founded firm is put on another employer's payday calendar, and the year crashes when they are met (Long Hill, Connecticut)"
area: world
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/counted-hire-own-calendar
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T14:40:47.250Z
---

**What.** Since the counted household jobs change (PR 5609), a counted worker hired by the jobs engine keeps a work commitment and a payroll calendar with their household, so they are on that payroll when met. The calendar is the template job's own, and a founded firm hires from a template at another employer. In Long Hill, Connecticut (key 0943580, seed m7b, the speed:year town) person_707b5aaa29672c43 is hired at organization:founded:manufacturing:person_0df027d90f1245cc:2025-05-01 on the calendar of organization_978dd88ebc7f87a3. When a constituent case fills them in on 2025-10-17, the payroll check refuses the calendar and the year stops with 'Payroll calendar lacks independently resolved job/person/employer owners.' Main's Long Hill year ran through before that merge (bisected over every merge since 185d76d7ce: last good f3f3cccef1, first bad f1f23098bd).

**Rules.** Wire to the world: a hire is paid by its own employer on that employer's calendar, as a full hire's calendar is built (hire in src/core2/modules/jobs.ts). One model, two tiers: a counted hire follows the same rule as a full one. Speed: the fix adds no daily scan and keeps one calendar per employer and template, not one per hire.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b) npm run speed:year runs its whole year on main with the fix, and a place drawn from all 56 runs its year too, named with its seed; a test in src/core2 hires a counted worker at a founded firm whose template job is at another employer, fills them in, and their payroll calendar names their own employer; the jobs, residents and counted-household-jobs tests pass.

**Files.** src/core2/modules/jobs.ts, src/core2/counted-household-jobs.test.ts

**Notes.** Filed Oct 24 by the speed lead: found when the module-table pair on main crashed; the instrumented check names the job, person, employer and calendar above.
