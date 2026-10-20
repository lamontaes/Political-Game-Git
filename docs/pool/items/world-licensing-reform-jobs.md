---
id: world-licensing-reform-jobs
title: A repealed occupational license opens licensed jobs to job seekers
area: world
kind: wiring
priority: 3
size: M
status: open
source: effect-web-poverty; stopgap SG-WEB-poverty-licensing-no-engine
---

**What.** The jobs engine matches seekers to jobs without any licensing requirement, so the law "reduce occupational licensing" reaches no one's pay. Give licensed occupations a requirement row in the jobs data, and let the match read the law row in force: where the license is repealed, seekers without it are matched to those jobs and their pay enters household income. The poverty measure (world-metrics povertyShare) then moves from incomes with no web link.

**Rules.** An effect is a read: the jobs engine must read the law row at the moment it matches a seeker. Wire to the world: it applies to every licensed occupation, not one example. No dice: who is matched follows from skills, pay and the law in force.

**Done when.** In a one-year run of the played world in a drawn place, a repeal row makes seekers hold licensed jobs they could not before, named by job record id, and the household's income rises in the poverty record; a test proves it.

**Files.** src/core2/modules/jobs.ts, src/core2/data/jobs/.

**Notes.** From the poverty family of the effect web. The link licensing-reform-to-poverty no longer runs on the ledger.
