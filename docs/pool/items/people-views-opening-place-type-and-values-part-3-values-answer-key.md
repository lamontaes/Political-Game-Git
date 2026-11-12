---
id: people-views-opening-place-type-and-values-part-3-values-answer-key
title: "The 14 values are checked against a sourced answer key"
area: people
kind: research
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after: people-views-opening-place-type-and-values-part-2-the-14-values
blocked-on:
lead: governing
model: opus
effort: medium
root: design-one-model-two-tiers
source: split from people-views-opening-place-type-and-values in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Check the formed values against a sourced answer key for the town's state and metro, as docs/packages/M1-views.md requires ("if the generated town's spread misses the key, fix the weights' sources, never assign views to fit"). The stopgap row says the 14 values have no answer key yet, so this part first finds a survey that measures them or close proxies, fetches and quotes it, and records it under data/research/. The counted groups must carry the same terms and values as full people, times their count, and the check must show it.

**Cause.** Design: docs/packages/M1-views.md (item 2 and item 8: the town's spread against the answer key for its state and metro) and the open stopgap SG-P15-views-first-version in src/core2/data/stopgaps/p15.json, which records that the 14 values have no answer key yet.

**Fix.** Find and fetch a survey source with the quoted pages (Pew's values and political typology surveys are the first place to look, then the American National Election Studies), write the key as a research file under data/research/people/ with each cell tagged SOURCED or ESTIMATED with its spread, add the check to src/core2/views.test.ts (a town's spread of each value against the key, reported with its distance, and the counted groups equal to full people times their count), and if the spread misses the key, change the weights' sources in part 2's table, never the people.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: the key is from pages actually fetched and quoted, with the source kept, and it checks the simulation and never decides an outcome. Estimate, never UNKNOWN: a cell the survey lacks is marked ESTIMATED with its source and spread. One model, two tiers: the check reads counted groups by the same rule as full people. One rule, all 56 places: no state is named in logic; keys are data by state and metro.

**Done when.** A second session, in a drawn place from all 56 (place and seed named), runs the values check and sees each of the 14 values' spread in the town reported beside the sourced key with its distance, the counted groups equal to full people times their count (by record id), and the research file's sources quoted; src/core2/views.test.ts passes.

**Waits on.** people-views-opening-place-type-and-values-part-2-the-14-values.

**Files.** src/core2/views.test.ts, src/core2/modules/views.ts, data/research/people/, docs/packages/M1-views.md

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have found and quoted a survey to check the 14 values; research precision that no player sees, and the values themselves are borderline on part 2.

**Notes (Fable B, Nov 10, the owner's answer).** Dropped Nov 10, 2026 (depth sweep): the owner was asked about the 14 values and said "Not now." This part checks those values against a key, so it goes with part 2. If he asks for the values later, both come back.
