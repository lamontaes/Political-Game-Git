---
id: gov-federal-questions-answers-stances
title: "The 25 federal-only policy questions have a standing federal answer and members' stances"
area: gov
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
milestone:
source: split from gov-stopgap-world-legislating-missing-mechanic by pool feeder Oct 20
---

**What.** Give each federal-only question (the 20 us-federal-positions questions and 5 us-tax-terms:federal terms in data/research/powers-catalog/question-powers.json) a recorded standing answer in src/core2/data/legislature/federal-answers.json, which lists only 2 today, and make members of Congress hold a stance on each from their own party, district and traits. answerIn in src/core2/modules/world-legislating.ts reads that file for the US, and officialParts in src/core2/modules/officials.ts gives a member's reasons on a question; extend both so every federal question returns an answer with a citation (the statute or the current law) and every member a stance that names how it was reached.

**Rules.** Research before building: each answer cites the statute or program as of 2026 and is SOURCED or ESTIMATED with spread. No dice: a member's stance comes from party, district conditions, traits and what they have heard, never a roll. Estimate, never UNKNOWN: a question federal law does not answer is recorded as no law, not a blank. One rule, all 56 places: answers are data by question and the member's district comes from the place data. Ask why: each stance cites its reasons by record.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, answerIn(api, 'US', question) returns a cited answer for all 25 questions and the town's representative holds a stance on each with reasons, named by member and question record ids; a new src/core2/federal-answers.test.ts proves it.

**Files.** src/core2/data/legislature/federal-answers.json, src/core2/modules/world-legislating.ts, src/core2/modules/officials.ts, src/core2/federal-answers.test.ts

**Notes.** Oct 20 (pool feeder): part 1 of 4 of gov-stopgap-world-legislating-missing-mechanic.
