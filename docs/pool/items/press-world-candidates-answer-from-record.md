---
id: press-world-candidates-answer-from-record
title: "World candidates' interview answers come from their record and temperament, so the press can catch one"
area: elections
kind: wiring
priority: 3
size: S
status: claimed
claimed-by: claude/traits-press-shade
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T14:36:36.058Z
---

**What.** Every candidate but the player answers a reporter's interview with the plain move (src/core2/modules/press.ts:1929 and :1935), so no world candidate's answer ever contradicts a record and press.dig never runs outside the player's own interviews: 168 interviews were accepted in Parkway, Missouri's election window and none was dug into. Let a world candidate's answer follow their own record and temperament through the same answer moves the player has.

**Rules.** No dice: whether a candidate shades the truth follows their traits and what their record holds, never a roll. Wire to the world: a dig the press runs on a world candidate is read by the news and the candidate's standing.

**Done when.** In one year of buildBenchWorld in a drawn place whose window holds a race, seed named, at least one world candidate's interview answer contradicts a record, press.dig runs on it with a decision record id, and the story it writes is read by the news engine.

**Files.** src/core2/modules/press.ts

**Notes.** Found Oct 24 by the traits lead's never-run audit.
