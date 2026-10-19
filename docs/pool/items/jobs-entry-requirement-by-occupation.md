---
id: jobs-entry-requirement-by-occupation
title: "Each occupation's typical entry requirement (credential, experience) from BLS Employment Projections ranks first-job applicants"
area: world
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: jobs-no-openings-in-small-towns
source: added with npm run pool -- add
---

**What.** Each occupation has a typical entry requirement in the Bureau of Labor Statistics Employment Projections: the credential, the experience in a related job and the on-the-job training. Today a first-job applicant is ranked without it, so a fresh school-leaver and a credentialed worker look alike to an employer. Add the requirement for every occupation the jobs engine hires into as data, and have the weekly fit pass in the jobs engine read it when it ranks applicants for an opening. Applicants who lack the requirement rank lower by a sliding amount of how far short they fall, never a pass or fail line.

**Rules.** Wire to the world: the ranking reads the requirement at the moment an employer picks among applicants, and the applicant's own education and work record supplies what they have. Estimate, never UNKNOWN: an occupation the table does not list takes its group's typical requirement, marked ESTIMATED with its source. One rule, all 56 places: the table is national data and no place is named in code. Sliding scales and causes: shortfall lowers fit smoothly.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a hire for an entry-level opening shows its applicants ranked with the requirement and each applicant's shortfall by record id, and a test in src/core2 proves that two applicants who differ only in credential rank in the right order. The owner plays it: a hiring manager passes over someone without the diploma the job asks for.

**Files.** src/core2/modules/jobs.ts, src/core2/data/jobs/

**Notes.** Written from the title on Oct 19 so the item meets the quality gate; source data is BLS Employment Projections, table of education, experience and training by occupation. Waits on jobs-no-openings-in-small-towns.
