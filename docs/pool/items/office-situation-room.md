---
id: office-situation-room
title: "The situation room reads crisis records"
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

**What.** Split from office-presidential-orders-pardons-the-situation-room, whose PR #5184 builds the presidential order only. crisesToday in src/core2/office-day-federal-president.ts still returns nothing (stopgap SG-OFFICE-FED-situation-room) because no engine writes a crisis record the president's day can read. Read the existing hazard and world-event records as crises, and give the president one choice at that moment that an agency or budget engine then acts on.

**Rules.** An effect is a read, not a record: the situation room reads crisis records, and the response is read by an agency or budget engine. Sliding scales and causes: a crisis comes from a hazard or event record, never a monthly chance. This is a game, not a spreadsheet: each crisis is one choice at its moment. No hand-written player text: briefings are worded by the English engine.

**Done when.** In a drawn place (buildBenchWorld, seed named in the PR body) a crisis record from an existing hazard or event producer reaches crisesToday, and the president's response changes an agency or budget record by id, tested in a played-year test; SG-OFFICE-FED-situation-room is resolved naming its reader.

**Files.** src/core2/office-day-federal-president.ts, src/core2/modules/executive.ts

**Notes.** TODO
