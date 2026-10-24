---
id: core-speed-cause-holder-weekly-contacts
title: "A person with a cause weighs the week's shortlist of their ties, not every tie every day (behind the owner's contact question)"
area: people
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/speed-cause-weekly-contacts
pr: #5920
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T06:37:48.095Z
---

**What.** A person holding a drive is offered a visit to every person they have a tie with, every day, and sharing a cause adds a tie with each person told, so in Bedford, Wyoming the contact offers grow from 111,000 in year one to 523,000 in year three. The owner's open question is whether activists contact only people they know; the simplest version that follows AGENTS.md is that a person with a cause weighs, each week, only the ties that pull hardest at the week's first look (hours lost, near or far, the same pull the chooser reads), up to causeHolderWeeklyContacts (TUNABLE). Everyone without a drive, and anyone with no more ties than the shortlist, is unchanged. It is built behind the owner-decision stopgap SG-PEOPLE-cause-holder-weekly-contacts.

**Rules.** Owner decisions are flagged, never waited on: the shortlist sits behind SG-PEOPLE-cause-holder-weekly-contacts and the question goes in the PR body. No dice: the week's shortlist is ranked by each tie's recorded pull and then by id, never drawn. Speed: no change makes a year slower, measured on the same base and machine.

**Done when.** In the played world (buildBenchWorld) Bedford, Wyoming (key 5606045, seed 9a4dd331ace7) and a place drawn from all 56 run three years paired against main on the same base and machine, with each year's time, the contact offers per activation and the activism acts per cause by drive record id before and after in the PR body; the stopgap is registered with kind owner-decision; the people, life, drives and contact-frequency tests pass.

**Files.** src/core2/modules/people.ts, src/core2/data/parameters.json, src/core2/data/stopgaps.json

**Notes.** Filed Oct 24 by the speed lead under speed-year-three-within-band and core-later-years-slower-drive-holders-offers; built on claude/speed-cause-weekly-contacts.
