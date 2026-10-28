---
id: director-opening-claims-tested-once
title: "The opening's unemployment-scope and House-floor claims are each tested once, not twice with different fixtures"
area: director
kind: cleanup
priority: 2
size: S
status: done
claimed-by: claude/dup-opening-test-pairs
pr: #6459
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T00:43:20.628Z
---

**What.** Two pairs of tests each make one claim about the opening twice with different fixtures. opening-rates-named.test.ts and opening-unemployment-scope.test.ts both check that every unemployment rate on the opening night names its place; opening-picture.test.ts and opening-pictures.test.ts both check that a State of the Union and an inaugural open on the House floor. Each pair costs a full played world per run for one claim (duplicates report rows W22 and B-T1).

**Rules.** Replace, never layer: the subset test of each pair is deleted and the one assertion it held that the other lacked (an area rate never says national) moves into the kept test, so no claim is lost.

**Done when.** grep finds no opening-rates-named.test.ts or opening-picture.test.ts; opening-unemployment-scope.test.ts and opening-pictures.test.ts pass in a played world (buildBenchWorld) in a place drawn from all 56, named in the PR, and the kept scope test also refuses an area rate worded as the nation's.

**Files.** src/director/opening-unemployment-scope.test.ts, src/director/opening-rates-named.test.ts, src/bench/opening-picture.test.ts, src/bench/opening-pictures.test.ts

**Notes.** TODO
