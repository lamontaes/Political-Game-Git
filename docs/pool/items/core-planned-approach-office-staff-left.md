---
id: core-planned-approach-office-staff-left
title: "A resident's planned visit to an office throws when the office's only staff member left after the plan"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: words/approach-staff-left
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T10:12:32.415Z
---

**What.** The free-time planner plans an approach to a known office days ahead, offered only while the office has staff (the known-office provider in src/core2/modules/life.ts). Since the office's staff follow its jobs (refreshOfficeStaff, Oct 24), the clerk can leave before the planned day. performPlanned re-checks only the action's prerequisites, so the approach runs and throws 'An official approach requires a recorded staff member.', which stops the day. Seen on clean main 4670cb768a: Springboro, Pennsylvania (place 4272872, drawn by drawPlace('86a32c18ca95db77:1', 'purpose-scenes')) throws on 2025-02-22 with nothing but the year running.

**Rules.** Wire to the world: a planned visit happens only if the office still has someone to receive it on the day. Replace, never layer: the staffed-office check moves from the offer provider into an eligibility rule that both the offer and the planned day read; no second check beside it.

**Done when.** In a played world on clean main, the Springboro seed above runs past 2025-02-22 without the throw, and a test in src/core2/life.test.ts shows a planned approach dropped on its day once the office has no staff: no office.approached record and no callback, where the same test without the rule throws.

**Files.** src/core2/modules/life.ts, src/core2/data/content.json, src/core2/life.test.ts

**Notes.** TODO
