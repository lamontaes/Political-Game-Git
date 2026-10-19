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

**What.** Each occupation should carry the experience a first job in it asks for, so a hire's fit can rank an entry-level opening by the applicant's reliability and referral. Today an opening ranks applicants without knowing whether the job asks for experience at all. Add a sourced entry-experience figure per occupation as data and have the hiring step read it.

**Rules.** Estimate, never UNKNOWN: an occupation with no source starts from the real average marked ESTIMATED with its spread. No dice: the ranking follows the applicant's record and the opening's ask.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and seed the builder did not choose, a hire into an entry-level opening cites the occupation's entry-experience row by record id, the ranking is checked in src/core2/jobs tests, and every number in the parameter table has its tag.

**Files.** src/core2/modules/jobs.ts, src/core2/data/jobs/parameters.json

**Notes.** Body written Oct 19 from the title when the pool check was red on main; the claiming or next session refines it.
