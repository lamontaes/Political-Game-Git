---
id: gov-congress-passes-policy-laws-part-2-stances-on-questions
title: "Every federal question has a cited answer and members and the President hold stances"
area: gov
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: opus
effort: high
root: rc1-world-outside-town
source: split from gov-congress-passes-policy-laws in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Give each federal-only question (the 20 `us-federal-positions` questions and 5 `us-tax-terms:federal` terms in `data/research/powers-catalog/question-powers.json`) a recorded standing answer in `src/core2/data/legislature/federal-answers.json`, which lists only 2 today, and make members of Congress and the President hold a stance on each from party, district and traits. This is part 2 of three. Today the President's `ownStance` is exactly 0 on every federal question in five drawn worlds (Oct 27), so the opening address has no Congress ask in 12 of 12 drawn places; a stance on each question brings the Congress section back with no director code. Feeds: gov-congress-passes-policy-laws.

**Cause.** Found in code: `answerIn` in `src/core2/modules/world-legislating.ts` reads `src/core2/data/legislature/federal-answers.json` (two questions today), and `officialParts` in `src/core2/modules/officials.ts` gives a member's reasons on a question; the President's `ownStance` in `src/core2/officials-roster.ts` returns 0 on every federal question.

**Fix.** Add a cited answer for every federal-only question to `federal-answers.json` (the statute or program as of 2026, SOURCED or ESTIMATED with spread, "no law" recorded as no law rather than a blank), and extend `answerIn`, `officialParts` and the President's `ownStance` so every question returns an answer with a citation and every member and the President a stance that names how it was reached.

**Time box.** 8 hours for one opus session.

**Rules.** Research before building: each answer cites the statute or program as of 2026. No dice: a stance comes from party, district conditions, traits and what the official has heard, never a roll. Estimate, never UNKNOWN. One rule, all 56 places. Ask why: each stance cites its reasons by record.

**Done when.** A second session plays a year in a drawn place (named with its seed) and sees `answerIn(api, 'US', question)` return a cited answer for all 25 questions, the town's representative and the President hold a stance on each with reasons, named by member and question record ids, and the opening address carry a Congress ask; `src/core2/federal-answers.test.ts` proves it.

**Waits on.** Nothing.

**Files.** src/core2/data/legislature/federal-answers.json, src/core2/modules/world-legislating.ts, src/core2/modules/officials.ts, src/core2/officials-roster.ts, src/core2/federal-answers.test.ts (new)

**Notes.** Nov 11 (cause finder for Fable B): part 1 now carries the federal axes (src/core2/data/legislature/federal-axes.json, read by questionAxis) and the answers for the 7 questions that have a reader. The President's and members' stances are 0 on federal-only questions because those questions have no axis, so part 1's axis rows give them a stance. What stays here: the answers for the other 18 questions, and the named reasons on each stance.
