---
id: office-session-days-committee-days-the-interim-the
title: "Session days, committee days, the interim, the district week and the State of the State from each st"
area: office
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/OFFICE-STATE.md line 18 (unchecked checklist line)"
---

**What.** State legislatures' session days, committee days, interim, district week and State of the State are not on the office-day calendar. Build each state's legislative calendar from data (sourced from state legislature sites) and make the office day read it, so the player is in the capital on session days, at the district in the interim, and the governor gives the State of the State in its season. The player would notice his state legislator's year following the real calendar.

**Rules.** One rule, all 56 places: calendars are data for all 56 places and no state is named in code; Research before building: each calendar cites the legislature's published schedule, tagged SOURCED or ESTIMATED with spread; Estimate, never UNKNOWN: a state with no published calendar starts from the real average marked ESTIMATED; An effect is a read, not a record: the office day and the legislature read the calendar at the moment they schedule; No dice: dates follow the data, not a roll; Wire to the world: session days gate votes and pay in a generated world; Replace, never layer: the state scheduler stand-in is deleted.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): the drawn state's legislator spends session days in the capital, interim days at the district and the district week on the calendar (calendar rows named), and the legislature holds floor votes only on session days. Tests beside `src/core2/office-day-calendar.test.ts` pattern and a check that all 56 places have rows. The owner plays it: sees his legislature adjourn and goes home for the interim.

**Files.** src/core2/office-day-state.ts, src/core2/office-day-calendar.ts, src/core2/modules/legislature.ts, src/core2/data/office-day/state-parameters.json

**Notes.** Checklist line from OFFICE-STATE.md; verify against main before starting.
