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

**What.** Each occupation the jobs engine hires into carries the experience a first job in it asks for, from O*NET's Job Zones (zone 1 and 2 ask little or none, zone 3 about a year or two, zones 4 and 5 more). The engine ranks applicants by experience times a weight, so an entry-level opening should count experience only up to what the occupation asks, leaving reliability and a referral to decide among applicants who all meet it. Map each occupation classification the opening uses to a zone, with the source and spread.

**Rules.** Research before building: the mapping cites O*NET Job Zones (CC BY 4.0) and its spread, and real rates check totals and never pick one applicant. Estimate, never UNKNOWN: an occupation with no mapped zone starts from the median zone, marked ESTIMATED. No dice: the pick is the applicant with the best fit, ties by record order, never a roll. One model, two tiers: counted applicants are ranked by the same rule as full people.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 and a seed the builder did not choose (name both in the PR body), an entry-level opening is won by the applicant with the best reliability and referral among those who meet its experience, and a senior opening by experience, shown by position and applicant record ids; a test beside src/core2/jobs-player-offers.test.ts passes.

**Files.** src/core2/modules/jobs.ts, src/core2/data/jobs/parameters.json, src/core2/data/jobs/occupation-experience.json (new)

**Notes.** After world-player-jobless-no-offers, which found that the player is one of about 32 applicants for each opening and has no experience. O*NET Job Zones can be downloaded as a text file (onetcenter.org database, Job Zones.txt); the engine's occupation strings are its own classifications (occupation:farmworker, service:police) and need a hand mapping to O*NET-SOC codes.
