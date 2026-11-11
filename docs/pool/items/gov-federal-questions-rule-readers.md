---
id: gov-federal-questions-rule-readers
title: "Federal rule questions, once enacted, change what people, firms and agencies may do, and an engine reads it"
area: gov
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
after: gov-federal-questions-answers-stances
blocked-on: gov-federal-questions-rule-readers-part-1-business-privacy-carbon-tariffs, gov-federal-questions-rule-readers-part-2-mandatory-minimums, gov-federal-questions-rule-readers-part-3-stock-trading-dc-statehood, gov-federal-questions-rule-readers-part-4-immigration-defense-aid
milestone:
source: split from gov-stopgap-world-legislating-missing-mechanic by pool feeder Oct 20
lead: governing
standard: 2
model: sonnet
effort: low
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** Federal rule questions, once enacted, change nothing of their own in the game. Measured Nov 10 in the law sweep in Marion, Mississippi (seed 7df73e53cd67): bills banning congressional stock trading and granting D.C. statehood were introduced with dev mode's Introduce, passed at 233 to 202 and 65 to 35, signed, run 180 days against a twin world with no bill, and moved nothing but their rider. For the federal-only questions that change rules rather than dollars (national data privacy, mandatory minimums, congressional stock trading, power plant carbon, tariffs, immigration admissions, defense and foreign aid levels, statehood for D.C.; the federal minimum wage already has a reader in `src/core2/law-reach/group-a-wages.ts`), write an effect reader for each, so the enacted law row changes what a business, a court, an official or a household may do, and a named engine reads it at its decision. The work is four parts. Seen: a federal rule law, once passed, changing what a business, official or household may do, shown on the law card and the person's card.

**Cause.** Measured: Marion, Mississippi (seed 7df73e53cd67), the law sweep: the bills banning congressional stock trading and granting D.C. statehood passed 233 to 202 and 65 to 35, were signed, run 180 days against a twin world, and moved nothing but their rider. Both are listed in the registered stopgap `SG-LAWS-federal-position-no-reader` (`src/core2/data/stopgaps/laws.json`).

**Fix.** Do the four parts, each a row in `src/core2/data/laws/reach-group-a.json` or a module hook that makes the deciding engine (business, court, official, household) read the enacted law, shown against a twin world. A question with no read the golden path or The Political Process needs is left out and noted for the owner.

**Time box.** 2 hours for one Sonnet session, the closing check after the parts. When it runs out, write what was seen in the item and stop.

**Rules.** An effect is a read, not a record: a rule with mechanic none is an unregistered placeholder, so each enacted answer must change a choice, a price, a sentence or an eligibility. The chain is the acceptance: one federal rule is followed to a named person or firm and the scene or journal line. One model, two tiers. This is a game, not a spreadsheet. No hand-written player text. Replace, never layer.

**Done when.** A second session plays a one-year world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose and sees each listed rule question, once enacted, change a named engine's result against a twin world, shown by law row id and the person, firm or case record id it reached; any question left out is named in the PR body; all four parts are merged and seen.

**Waits on.** gov-congress-passes-policy-laws (a federal law must be enactable), and the four parts: gov-federal-questions-rule-readers-part-1-business-privacy-carbon-tariffs, gov-federal-questions-rule-readers-part-2-mandatory-minimums, gov-federal-questions-rule-readers-part-3-stock-trading-dc-statehood, gov-federal-questions-rule-readers-part-4-immigration-defense-aid. Related: laws-three-yes-no-laws-reach-nobody (whoever claims either says so in the other's Notes).

**Files.** src/core2/data/laws/reach-group-a.json, src/core2/law-reach/group-a.ts, src/core2/modules/justice.ts, src/core2/modules/business.ts, src/core2/data/stopgaps/laws.json

**Notes.** Oct 20 (pool feeder): part 3 of 4 of gov-stopgap-world-legislating-missing-mechanic. Defense spending and foreign aid are budget lines, so they may belong with the money readers; the builder places each in the part that carries its read and notes it in the PR.

Nov 10, Fable audit: measured in the law sweep in Marion, Mississippi (seed 7df73e53cd67). The bills banning congressional stock trading and granting statehood to the District of Columbia were each introduced in Congress with dev mode's Introduce, passed with dev mode's vote at 233 to 202 and 65 to 35, signed, run 180 days and compared with a twin world with no bill on every cash account. Both showed only their rider's change and nothing of their own; the audit names them, with raising tariffs, among seven yes-or-no questions in Congress that did nothing of their own in 180 days. Read: the audit found no part of the game that names either law, and on main both are still listed in the registered stopgap SG-LAWS-federal-position-no-reader (src/core2/data/stopgaps/laws.json). The audit's priority 2 item for these two questions and student loan forgiveness, with a twin-world check in the running game, is `laws-three-yes-no-laws-reach-nobody`; whoever claims either item says so in the other's Notes. Source: docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2.

**Notes (Fable's check, Nov 10).** Part 2 (mandatory minimums) is a proposed drop: the federal courts engine already reads that law. The closing check covers parts 1, 3 and 4.
