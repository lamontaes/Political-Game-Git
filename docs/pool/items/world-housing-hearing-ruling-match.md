---
id: world-housing-hearing-ruling-match
title: "The eviction hearing follows the Oct 14 ruling (completes after the state's notice period, no court scene), so the no-judge stopgap is resolved by the ruling"
area: world
kind: stopgap
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "split from world-stopgap-housing-faked-mechanic (claude/housing-landlord-judge notes, Oct 19)"
---

**What.** The owner ruled on Oct 14 that an eviction completes after the state's notice period from the law in force, the household moves as the housing engine moves leavers, and there is no court scene until courts come. The hearing step in `housing.ts` still carries stopgap SG-WORLD-housing-hearing-without-judge, which says courts are parked, and still adds counsel payments and settlement plans the ruling does not mention. Make the hearing step do what the ruling says, delete the fake and the stopgap row, or write the question to the owner if counsel and settlement are meant to stay.

**Rules.** Look before you ask: the ruling is `Evictions without courts` in `docs/coordination/OWNER-DECISIONS.md` (Oct 14); quote it. Replace, never layer: the no-judge marker and its row go in the same change. No dice: the outcome follows the law's notice period and the record of rent owed.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, place and seed named in the PR body) a case filed in the year ends on the date the place's notice period from the law in force allows, named by case record id and law row id, and the household's lease ends by the same record. The test in `src/core2/housing.test.ts` and the stopgap tripwire show SG-WORLD-housing-hearing-without-judge gone from `src/core2/data/stopgaps.json`.

**Files.** src/core2/modules/housing.ts, src/core2/data/stopgaps.json, src/core2/housing.test.ts

**Notes.** AGENTS.md puts courts after early access, so no judge is built here. The hearing branch is at about line 1273 of housing.ts. Check the right-to-counsel rows in the law in force before removing counsel.
