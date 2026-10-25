---
id: office-presidential-pardons
title: "Presidential pardons the court and prison read"
area: office
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: office-presidential-orders-pardons-the-situation-room
source: added with npm run pool -- add
---

**What.** Split from office-presidential-orders-pardons-the-situation-room, whose PR #5184 builds the presidential order only. pardonable in src/core2/office-day-federal-president.ts still returns nothing (stopgap SG-OFFICE-FED-pardons) because the justice engine has no federal sovereign to pardon. Build a federal-sovereign case record in justice and a pardon the president grants from it, so a pardoned person leaves custody or their sentence ends. The player would notice it on the politics screen as a choice among people, never a form.

**Rules.** An effect is a read, not a record: the court and prison read the pardon at the moment they hold or release someone. Ask why: each pardon keeps its reasons and the case record cited by id. No dice: when the player does not choose, the character decides from traits and the law, not a roll. No hand-written player text: the pardon is worded by the English engine.

**Done when.** In a drawn place (buildBenchWorld, seed named in the PR body) a pardon record is read by the justice engine and a named person's custody or sentence record changes by id, tested in a played-year test; SG-OFFICE-FED-pardons is resolved naming its reader.

**Files.** src/core2/office-day-federal-president.ts, src/core2/modules/justice.ts, src/core2/modules/executive.ts

**Notes.** TODO
