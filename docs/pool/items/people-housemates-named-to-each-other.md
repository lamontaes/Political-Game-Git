---
id: people-housemates-named-to-each-other
title: "Full housemates know each other by name, and relatives in one home are kin on record"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: m0-m2
---

**What.** In a drawn bench world many full housemates are neither kin on record nor in each other's knownIds. Stem, North Carolina (seed hh-a, draw hh, buildBenchWorld two-level, start day): 68 of 258 full housemate pairs are neither, for example Christopher Walton and Lily Walton (person_006f9e0e33a27d16, person_006f9f0e33a27ec9, tier weekly). Crooked Creek, Alaska (seed hh-b): 0 of 32. A scene or journal can name someone only by a kin fact or a known name, so these people go unnamed: the family filing talk at home and the journal line for a strained ending (words/journal-scene-endings) both skip them.

**Rules.** One rule, all 56 places; two-level population: a person filled in matches the records; no dice. People who live together know each other's names; relatives in one household carry the family fact that says how they are related.

**Done when.** In two buildBenchWorld drawn places, named with place and seed, a test counts full housemate pairs and finds every pair either kin on record or known by name, with the record id of the fact or the known-person source; the family stake scene test's journal line check is not skipped for a housemate.

**Files.** src/core2/modules/people.ts, src/core2/population.ts

**Notes.** TODO
