---
id: core-custom-size-pin
title: "A custom world keeps the size the player asked for"
area: core
kind: bug
priority: 3
size: S
status: done
claimed-by: claude/custom-size-pin
pr: #4639
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at: 2026-10-16T07:51:01.709Z
---

**What.** `buildPopulation` takes `minimumPeople` as asked now, but no test pins it: the Oct 11 report was Wyoming and Rhode Island opening with 7,582 people for a custom world of 1,500. Add the test and fix any place that still overshoots.

**Rules.** One rule, all 56 places.

**Done when.** A test opens Wyoming and Rhode Island and two drawn places with settings population 1500 and asserts the full-person plus counted total stays under about 1,700, naming each place and seed.

**Files.** src/core2/population.ts, src/core2/world-settings.test.ts

**Notes.** core.md line 209, checked Oct 15.
