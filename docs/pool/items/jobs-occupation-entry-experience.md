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

**What.** Each occupation carries the experience a first job in it asks for, so an entry-level opening can be ranked by how reliable an applicant has been and who referred them. A teenager or a new graduate then competes for the openings that take beginners, and a long-employed person is not read as the best fit for every post. The experience figure comes from the occupation data and is read when the employer chooses among applicants. The player would notice it as who gets hired for a first job and why.

**Rules.** No dice: an applicant's fit comes from their work record, reliability and referral, never a roll; An effect is a read, not a record: the jobs engine reads the occupation's entry experience when it ranks applicants and the hire's recorded reason cites it; Estimate, never UNKNOWN: an occupation with no figure starts from its group's typical value marked ESTIMATED with its source; One rule, all 56 places: the figures are occupation data, never a named place; One model, two tiers: counted applicants follow the same rule as full people.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, named in the PR body, a first-job opening is filled by an applicant ranked on the occupation's entry experience, and the hire's recorded reason names it by position record id; a test in src/core2 shows it and the jobs tests pass.

**Files.** src/core2/modules/jobs.ts, src/core2/data/jobs/jobs.json

**Notes.** Body written Oct 19 (claude) from the title and the repo layout; the claimant should sharpen it.
