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
source: found building world-player-jobless-no-offers
---

**What.** The jobs engine ranks every applicant to an opening by experience times a weight, plus reliability and a referral, so an 18-year-old with no experience loses every opening to a counted applicant who has some, even for a job that asks for none (the player made no offer in a whole year in Addison, West Virginia and Fort Laramie, Wyoming). The model has no record of what experience an occupation asks for, so the rule cannot tell an entry-level opening from one that needs years. Add to the jobs data, per occupation, the typical work experience in a related occupation and the typical on-the-job training, from the Bureau of Labor Statistics occupational outlook tables (SOURCED, with citation). Then let the weekly pick count experience only up to what the opening asks, on a sliding scale, so an opening that asks none ranks applicants by reliability and referral.

**Rules.** No dice: the opening's stated requirement and the applicant's record decide, never a roll. Sliding scales and causes: experience counts in proportion up to the requirement, with no threshold that flips. Research before building: every requirement is read from the BLS table and cites it; real rates check totals and never pick one hire. One model, two tiers: counted and full applicants are scored by the same rule.

**Done when.** In a drawn place (name and seed in the PR body) a one-year run of the played world (buildBenchWorld) shows a jobless 18-year-old player matched to an entry-level opening they apply to, by position and offer record ids, in at least one town that made no offer before, and a test in src/core2/jobs-player-offers.test.ts holds it. Every occupation in the jobs data has a requirement row with its citation.

**Files.** src/core2/modules/jobs.ts, src/core2/data/jobs/jobs.json, src/core2/data/jobs/parameters.json

**Notes.** Found Oct 19 while reading world-player-jobless-no-offers: its notes say the fit rule has to let a first job exist, and the data it would need is not in the model. The item `world-player-jobless-no-offers` waits on this one.
