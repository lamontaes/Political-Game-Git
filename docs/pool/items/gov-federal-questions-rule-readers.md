---
id: gov-federal-questions-rule-readers
title: "Federal rule questions, once enacted, change what people, firms and agencies may do, and an engine reads it"
area: gov
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
after: gov-federal-questions-answers-stances
blocked-on:
milestone:
source: split from gov-stopgap-world-legislating-missing-mechanic by pool feeder Oct 20
---

**What.** For the federal-only questions that change rules rather than dollars (federal minimum wage, which already has a reader in law-reach/group-a-wages.ts, national data privacy, mandatory minimums, congressional stock trading, power plant carbon, tariffs, immigration admissions, defense and foreign aid levels, statehood for D.C.), write a core2 effect reader for each: the enacted law row changes what a business, a court, an official or a household may do, and a named engine reads it at its decision. Each reader adds a data row to reach-group-a.json or a module hook, uses the powers catalog for who is bound, and does not carry over the old src/simulation code.

**Rules.** An effect is a read, not a record: a rule with mechanic none is an unregistered placeholder, so each enacted answer must change a choice, a price, a sentence or an eligibility. The chain is the acceptance: one federal rule is followed to a named person or firm and the scene or journal line. One model, two tiers: counted people are bound by the same rule times their count. This is a game, not a spreadsheet: a question with no read the golden path or The Political Process needs is left out and noted for the owner. No hand-written player text: words come from the English engine.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, each listed rule question, once enacted, changes a named engine's result, shown by law row id and the person, firm or case record id it reached; src/core2/federal-rule-questions.test.ts proves it, and any question left out is named in the PR body.

**Files.** src/core2/data/laws/reach-group-a.json, src/core2/law-reach/group-a.ts, src/core2/modules/justice.ts, src/core2/modules/business.ts, src/core2/federal-rule-questions.test.ts

**Notes.** Oct 20 (pool feeder): part 3 of 4 of gov-stopgap-world-legislating-missing-mechanic. Defense spending and foreign aid are budget lines, so they may belong with the money readers; the builder places each in the part that carries its read and notes it in the PR.

Nov 10, Fable audit: measured in the law sweep in Marion, Mississippi (seed 7df73e53cd67). The bills banning congressional stock trading and granting statehood to the District of Columbia were each introduced in Congress with dev mode's Introduce, passed with dev mode's vote at 233 to 202 and 65 to 35, signed, run 180 days and compared with a twin world with no bill on every cash account. Both showed only their rider's change and nothing of their own; the audit names them, with raising tariffs, among seven yes-or-no questions in Congress that did nothing of their own in 180 days. Read: the audit found no part of the game that names either law, and on main both are still listed in the registered stopgap SG-LAWS-federal-position-no-reader (src/core2/data/stopgaps/laws.json). The audit's priority 2 item for these two questions and student loan forgiveness, with a twin-world check in the running game, is `laws-three-yes-no-laws-reach-nobody`; whoever claims either item says so in the other's Notes. Source: docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2.
