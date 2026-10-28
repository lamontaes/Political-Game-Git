---
id: director-scenes-from-circumstance
title: "Any record the simulation keeps can call a scene where the player is, when a person with a reason is there"
area: director
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr: #6263
blocked-on:
lead: director
source: director lead work order docs/work-orders/lead-director-2026-10-27.md, deliverable 1; owner Oct 27 01:30 ruling
claimed-at:
---

**What.** A circumstance producer (src/director/circumstance.ts, rows in src/director/data/circumstances.json) reads each day's new records by kind (core.logByKind, no history scan), resolves where the player is that day from records (home, workplace on a work day, the body's building on a sitting day, the town in public), casts the person with a reason to be there by score (named in or reached by the record, a tie of the player's, an office record that puts them at the place; highest score, record id breaks ties) and writes a moment into the player's ledger so the existing scheduler stages the situation type. Rows at minimum: a law passed or taking effect, a printed story, a price change, a hire, a death in the town, a national event in the news, the capitol hallway on a sitting day. Every one of the 29 situation types that can never fire on main gets a row or producer, or is deleted. Each row carries trigger record kind, place kind, cast rule and outcome record for the scene web.

**Time box.** 8 hours, Opus (director lead), no helpers.

**Rules.** Owner, Oct 27 01:30: any record can call a scene, the examples are a floor. No dice. Speed: only the day's new records. One rule, all 56 places. The chain is the acceptance. Replace, never layer: one director path, no second scheduler. scene-standard.

**Done when.** src/director/circumstance.test.ts plays a year of buildBenchWorld in a drawn place (place and seed printed), the player filed and in a second world serving: each of the seven row families stages at least one scene citing its record id and a cast person other than the subject; no scene on a day with no matching record. npm run words:coverage shows zero untriggered types and zero awaitingProducer causes. npm run speed:year within 20% of base.

**Files.** src/director/circumstance.ts, src/director/data/circumstances.json, src/director/data/situation-types.json, src/director/ledger.ts, src/director/scheduling.ts, src/director/circumstance.test.ts

**Notes.** TODO

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): already built (merged #6263).
