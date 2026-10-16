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
claimed-at:
---

**What.** Checked against main on Oct 16: PARTLY. Built: the budget message (`budget-proposal` reads into `councilBudget`), executive orders (one orderable order), the line-item veto (`executiveItemVeto`), the State of the State, and appointment (`appointGovernor`, called only from a script, not an office-day entry). Missing: clemency anywhere; emergency and Guard powers are deferred by the owner. Next: Clemency, and make governor appointment an office-day entry. The player would notice the act on the politics screen as a choice among people, never a form.

**Rules.** One rule, all 56 places: every power and its limits come from state data for all 56 places, with no state named in code; An effect is a read, not a record: the legislature reads the governor's budget and vetoes, and departments read orders and appointments, at the moment they act; Ask why: each act keeps reasons and the law row it cites; The chain is the acceptance: follow one line-item veto from the act to the budget line cut, the program funding that changed and a person it reached; No dice: when the player does not choose, the character decides from traits and the law, not a roll; No hand-written player text: orders, speeches and results are worded by the English engine; This is a game, not a spreadsheet: each power is one choice at its season, not a form; Replace, never layer: any governor stand-in is deleted.

**Done when.** In a drawn state (buildBenchWorld, seed named in the PR body) a governor's clemency act on a state conviction changes the sentence the justice engine reads, shown by the sentence and clemency record ids, and a test in `src/core2/office-day-state.test.ts` covers it. The owner plays it: Clemency, and make governor appointment an office-day entry.

**Files.** src/core2/office-day-state.ts, src/core2/modules/executive.ts, src/core2/appointments.ts, src/core2/data/office-day/state-line-item-veto.json

**Notes.** Checklist line from OFFICE-STATE.md; verify against main before starting.
