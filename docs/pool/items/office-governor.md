---
id: office-governor
title: "Governor:"
area: office
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/OFFICE-STATE.md line 23 (unchecked checklist line)"
---

**What.** A governor the player controls has none of the governor's powers in the office day: appointments, executive orders, the budget proposal, the line-item veto where the state has it, emergencies and the Guard, clemency and the State of the State. Build them on the shared engine and the executive module, each as an act with its stop, reading the state's own rules (the line-item veto table `src/core2/data/office-day/state-line-item-veto.json` already exists). The player would notice a governor's year: a budget to send, vetoes to line through, appointees to name and a speech to give.

**Rules.** One rule, all 56 places: every power and its limits come from state data for all 56 places, with no state named in code; An effect is a read, not a record: the legislature reads the governor's budget and vetoes, and departments read orders and appointments, at the moment they act; Ask why: each act keeps reasons and the law row it cites; The chain is the acceptance: follow one line-item veto from the act to the budget line cut, the program funding that changed and a person it reached; No dice: when the player does not choose, the character decides from traits and the law, not a roll; No hand-written player text: orders, speeches and results are worded by the English engine; This is a game, not a spreadsheet: each power is one choice at its season, not a form; Replace, never layer: any governor stand-in is deleted.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): ten days as a governor in the drawn state (name it and the seed) show each power available when the law has it, with at least one executive order, one appointment, one budget message and one veto or clemency decision traced by record id to an effect another engine read. Tests beside `src/core2/office-day-state.ts` and `executive.test.ts`. The owner plays it: as governor, line-vetoes an item and reads the news the next day.

**Files.** src/core2/office-day-state.ts, src/core2/modules/executive.ts, src/core2/appointments.ts, src/core2/data/office-day/state-line-item-veto.json

**Notes.** Checklist line from OFFICE-STATE.md; verify against main before starting.
