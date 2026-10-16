---
id: office-presidential-orders-pardons-the-situation-room
title: "Presidential orders, pardons, the situation room:"
area: office
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/OFFICE-FEDERAL.md line 19 (unchecked checklist line)"
---

**What.** A president the player controls has no executive orders, pardons or situation room: they are registered stand-ins (SG-OFFICE-FED-situation-room, SG-OFFICE-FED-trip-residents) waiting on GOV powers and on crisis records. Build federal executive orders through the executive module, pardons through the federal side of the justice engine, and the situation room on the crisis records. The player would notice orders that change what agencies do, a pardon that frees a named person and a briefing when something happens.

**Rules.** An effect is a read, not a record: agencies read the order at the moment they act, the court and prison read the pardon, and the situation room reads crisis records; Ask why: each order and pardon keeps reasons and the law row cited by record id; The chain is the acceptance: follow one order to the agency's changed rule, the payment or enforcement that changed and a person reached; No dice: when the player does not choose, the character decides from traits and the law, not a roll; One rule, all 56 places: powers come from federal law data; This is a game, not a spreadsheet: each power is one choice at its moment; No hand-written player text: orders and briefings are worded by the English engine; Placeholders: the two SG-OFFICE-FED rows close only when real records are read.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body) (the federal day runs for the sitting president): one executive order, one pardon and one situation-room briefing are produced and read by another engine (order, pardon and crisis record ids named). Tests beside `src/core2/office-day-federal.test.ts`. The owner plays it: as president, signs an order and sees an agency change what it does.

**Files.** src/core2/office-day-federal-president.ts, src/core2/modules/executive.ts, src/core2/modules/justice.ts, src/core2/data/office-day/federal-cabinet.json

**Notes.** Checklist line from OFFICE-FEDERAL.md; verify against main before starting.
