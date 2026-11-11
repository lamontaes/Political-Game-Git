---
id: people-views-opening-place-type-and-values-part-2-the-14-values
title: "Each adult opens with the 14 values, formed from their own records with reasons"
area: people
kind: feature
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after: people-views-opening-place-type-and-values-part-1-place-type-term
blocked-on:
lead: governing
model: opus
effort: medium
root: design-one-model-two-tiers
source: split from people-views-opening-place-type-and-values in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Form the game's 14 values (limited government, collective provision, local control, fiscal restraint, equal treatment, personal liberty, public safety, property rights, environmental stewardship, equal opportunity, tradition, transparency, protection for working people, open competition) for each adult at the opening from their own records (upbringing, faith, schooling, work, place and family), through researched weights, and keep them with the reasons behind each. Stances on issues stay separate records that can drift and disagree with the values. Counted groups carry the same values, times their count. The old core formed these by hand-set weights; the new core forms them nowhere.

**Cause.** Design: docs/packages/M1-views.md (item 2 of its plan: a person's values and stances come from their own life through researched weights, then are checked against answer keys; item 7: voter groups carry values); no module in src/core2 forms the 14 values, as the open stopgap SG-P15-views-first-version in src/core2/data/stopgaps/p15.json states.

**Fix.** Add a values record to the views module (src/core2/modules/views.ts) formed once per adult from their education, faith, upbringing and place records with weights from a researched table (SOURCED or ESTIMATED with a spread, never typed), saved with its reasons for the player and the people they deal with and recomputable on a click for others; give each counted voter group the same values by the same rule times its count; and have one other engine read the values (a vote or a stance decision) so the record is a read, not a record nobody uses.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted group is read by the same rule as a full person, times its count. An effect is a read, not a record: another engine (voting or a stance decision) reads the values and the proof names it by record id. No dice: the values follow the person's records and the weights, never a roll. Estimate, never UNKNOWN: a cell the research lacks starts from the national average marked ESTIMATED with its spread. Speed: formed once per person on the first read, no daily scan.

**Done when.** A second session, in a one-year run of the played world (buildBenchWorld, a drawn place from all 56 with a seed the builder did not choose, both named), finds every adult in the town with the 14 values and their reasons by record id, two neighbors of different upbringing holding different values, and one other engine (a vote tally or a stance) reading those values by record id; a test in src/core2/views.test.ts covers the formation and the counted groups.

**Waits on.** people-views-opening-place-type-and-values-part-1-place-type-term, because both change the opening lean in the same file.

**Files.** src/core2/modules/views.ts, src/core2/data/views/views.json, src/core2/campaign-views.ts, docs/packages/M1-views.md, src/core2/views.test.ts

**Notes (Fable B, Nov 10, the owner's answer).** Dropped Nov 10, 2026 (depth sweep): the owner was asked and said "Not now." People keep the stances they form from their records. If he asks for the values later, this item comes back.
