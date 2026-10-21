---
id: director-office-scene-number-literal
title: "director.test fails on main: office-scene.ts holds a bare 0 where the director keeps numbers in data"
area: director
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/director-office-scene-number-literal
pr: #5384
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:35:41.540Z
---

**What.** The director test that keeps every number out of the director's code fails on main: src/director/office-scene.ts holds a bare numeric literal 0, added by the commit that made the office scene's target a seated official. The test lists it as office-scene.ts:0. Replace the literal with the parameter the other director files use, so the director test is green again. Add no new number to code.

**Rules.** Keep numbers in data: the director test fails on any bare numeric literal in src/director, and the numbers belong in the parameter table with their tag. A fix that uses the existing zero parameter adds nothing to the table.

**Done when.** The director test registers every stopgap it marks and keeps numbers in data passes on main, run as src/director/director.test.ts, and the literal is gone from src/director/office-scene.ts by a test that lists no literals.

**Files.** src/director/office-scene.ts, src/director/director.test.ts

**Notes.** TODO
