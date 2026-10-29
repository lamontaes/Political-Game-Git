---
id: history-past-work
title: "The working life before the start is simulated, not generated"
area: core
kind: feature
priority: 1
size: M
status: done
claimed-by: claude/history-past-work
pr: #6452
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T23:18:30.676Z
---

**What.** The owner's ruling of Oct 27 (fix history not simulating before 2025; OWNER-DECISIONS 'The world has a past') needs the years before day one to run, not to be drawn. Today a 35-year-old's Journal stops at age 14 because nothing between school and the opening exists, and deep-past.ts writes only a work:tenure-summary proxy copied from the opening job's estimated start. This item runs every full adult's working life quarter by quarter from leaving school to the start date in the people phase of the pre-start run, reading the economy pass's published months and the business pass's founding dates, so each job, layoff, quit and spell out of work is a dated history record with a cause.

**Rules.** No dice: every separation and hire follows from the person's traits, age, schooling and the quarter's recorded economy, never a seeded roll. An effect is a read: the Journal, conversation, speech and appointment engines read the new records by id. Replace, never layer: the work:tenure-summary proxy in deep-past.ts and its readers are deleted in the same change. One rule, all 56 places: no place named in logic. Speed: a town's year stays under two minutes and within 20% of main.

**Done when.** In buildBenchWorld with a 35-year-old player in a drawn place (place and seed in the PR body), preStartHistory lists person.work-spell records for the player by record id with each ending's cause record id (an economy.conditions month or a family record), composeJournal tells the years after school from those records, a second seed in the same place shows a different working life, src/core2/past-work.test.ts passes, and npm run speed:year stays under two minutes.

**Files.** src/core2/past-work.ts, src/core2/modules/people.ts, src/core2/deep-past.ts, src/director/journal.ts, src/director/conversation.ts, src/director/speech-builder.ts, src/core2/modules/executive.ts

**Notes.** TODO Oct 28, 21:15 UTC (elections wire session): src/core2/trait-coverage.test.ts "finds every decision in code that weighs traits" fails on clean main with "src/core2/past-work.ts decides with traits but is not in the decision table": past-work.ts needs its row in data/content/trait-decisions.json (then `node --import tsx scripts/traits/trait-coverage.ts`).
