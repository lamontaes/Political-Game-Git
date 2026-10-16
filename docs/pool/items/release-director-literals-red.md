---
id: release-director-literals-red
title: "Director test red on main: number literals in speech-builder.ts and words.ts"
area: words
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: merger run Oct 16 after #4477
---

**What.** Since the speech builder merged (#4477), src/director/director.test.ts fails its case named registers every stopgap it marks and keeps numbers in data. The same file also trips src/core2/trait-coverage.test.ts, case finds every decision in code that weighs traits: src/director/speech-builder.ts decides with traits but is not in the decision table (data/content/trait-decisions.json), so list it there with its reason or route it through a listed decision. The scan of src/director finds number literals at speech-builder.ts lines 4 and 18 and words.ts line 1, and the test expects none. Numbers belong in data or in the parameter table with a tag, so move them there and keep the scan strict.

**Rules.** Follow the standing rule "Every number lives in the parameter table" from AGENTS.md as the Placeholders section states it, and "Replace, never layer": move each literal into src/director/data parameters with a tag and spread, and never loosen the scan or skip the case.

**Done when.** The director test file passes every case on a fresh run in a drawn place, the speech builder test still passes in a played world, and the change names the parameter record id that now holds each moved number.

**Files.** src/director/speech-builder.ts, src/director/words.ts, src/director/data/director.json, src/director/director.test.ts

**Notes.** Found by the merger after merging #4477; the merger had run only the changed test files and missed this neighbor. A second director case, the world moments, is separately red on main (director-world-moments-red-on-main).
