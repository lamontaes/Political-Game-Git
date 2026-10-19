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

**What.** Each occupation in the jobs data gets the entry requirement the Bureau of Labor Statistics Employment Projections list for it: the typical education, any work experience in a related job and the on-the-job training. A first-job applicant is ranked for an opening by how well their schooling and experience meet that row, so a person with no experience is not first in line for a post that asks for years. Today every applicant for an opening is read the same way regardless of what the job asks for. The requirement lives in data keyed by occupation code, never by a named place, and the ranking reads it at the moment the employer decides.

**Rules.** No dice: the ranking comes from the applicant's schooling and experience against the occupation's requirement, never a roll; An effect is a read, not a record: the jobs engine reads the requirement row when it ranks applicants, and a table nobody reads is not finished; Estimate, never UNKNOWN: an occupation the table lacks starts from its major group's typical requirement marked ESTIMATED with its source; One rule, all 56 places: the requirement table is national data with no place named in code; One model, two tiers: a counted applicant is ranked by the same rule as a full person.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, named in the PR body, an opening that asks for experience is filled by an applicant whose record meets it, shown by the position record id and the hire's job record, and a test in src/core2 states it; the jobs tests still pass.

**Files.** src/core2/modules/jobs.ts, src/core2/data/jobs/jobs.json

**Notes.** Body written Oct 19 (claude) from the title and the repo layout; the claimant should sharpen it.
