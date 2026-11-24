---
id: release-director-farewell-literal
title: "Director test red on main: a number literal for the farewell wordings in conversation.ts"
area: director
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/director-farewell-wordings-literal
pr: #4808
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T19:50:40.087Z
---

**What.** The director test that keeps numbers in data fails on main: src/director/conversation.ts holds the number 4 as a constant for how many wordings of a parting word are tried. A change that stops a talk from parting on a line it already said added it. Move the number into the director's parameter table, tagged with its source and spread, and read it from there.

**Rules.** Replace, never layer: the constant is deleted in the same change that adds the parameter. Estimate, never UNKNOWN: the number is tagged ESTIMATED with where it comes from and its spread.

**Done when.** src/director/director.test.ts passes on clean main, including the test that registers every stopgap and keeps numbers in data, and a talk in a drawn place still tries up to four wordings of a farewell, shown by the director test run with the parameter read from director.json.

**Files.** src/director/conversation.ts, src/director/data/director.json, src/director/director.test.ts

**Notes.** Found Oct 16 while merging main into the law-reached scene branch.
