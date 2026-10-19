---
id: jobs-occupation-entry-experience
title: "Each occupation carries the experience a first job in it asks for, so a hire's fit can rank an entry-level opening by reliability and referral"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: world-player-jobless-no-offers
source: added with npm run pool -- add
---

**What.** Each occupation carries the years of experience that a first job in it asks for, so an entry-level opening can rank its applicants by that experience. Today a hire's fit does not separate a worker with a related past job from one without, so entry-level openings are filled in an order no cause explains. Add the experience to each occupation as data and let the fit pass in the jobs engine count the applicant's reliability and referral from a worker the employer already knows when the experience is short. A referral and a clean work record make up for missing experience smoothly.

**Rules.** An effect is a read, not a record: the experience is read when the employer ranks applicants and shows in the hire's recorded reasons. Sliding scales and causes: missing experience lowers fit by how many years are missing and a referral raises it, with no cutoff. One rule, all 56 places: the occupation table is data and no place is named in code. Estimate, never UNKNOWN: an occupation with no figure takes its group's average marked ESTIMATED.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, an entry-level hire records the experience asked for, the applicant's experience, any referral and the reliability read, by record id, and a test in src/core2 shows a referred applicant outranks an unreferred one with the same experience. The owner plays it: a first job goes to the person a coworker vouched for.

**Files.** src/core2/modules/jobs.ts, src/core2/data/jobs/

**Notes.** Written from the title on Oct 19 so the item meets the quality gate. Waits on world-player-jobless-no-offers.
