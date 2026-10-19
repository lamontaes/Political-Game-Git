---
id: office-session-days-committee-days-the-interim-the
title: "Session days, committee days, the interim, the district week and the State of the State from each st"
area: office
kind: feature
priority: 2
status: in-pr
claimed-by: claude/political-game-pool-l9cym2-b
pr: #5172
blocked-on:
milestone:
source: "docs/coordination/OFFICE-STATE.md line 18 (unchecked checklist line)"
claimed-at: 2026-10-19T21:39:17.567Z
---

**What.** Checked against main on Oct 16: PARTLY. Session windows for all 56 places are data (`state-session-calendar.ts`) and `sessionOn` drives capital, district and interim days. But the district week and the committee day are one global estimate (`state-parameters.json`: `sessionWeek`, `interimCommitteeDayOfMonth`), not per state. Next: Per-state district week and committee day rows, read in place of the global default. The player would notice the act on the politics screen as a choice among people, never a form.

**Rules.** One rule, all 56 places: calendars are data for all 56 places and no state is named in code; Research before building: each calendar cites the legislature's published schedule, tagged SOURCED or ESTIMATED with spread; Estimate, never UNKNOWN: a state with no published calendar starts from the real average marked ESTIMATED; An effect is a read, not a record: the office day and the legislature read the calendar at the moment they schedule; No dice: dates follow the data, not a roll; Wire to the world: session days gate votes and pay in a generated world; Replace, never layer: the state scheduler stand-in is deleted.

**Done when.** A test covers all 56 places having a district-week row and a committee-day row with a source or an ESTIMATED mark, and `stateDay` reads them, shown by a drawn state's entries (buildBenchWorld, seed named in the PR body). The owner plays it: Per-state district week and committee day rows, read in place of the global default.

**Files.** src/core2/office-day-state.ts, src/core2/office-day-calendar.ts, src/core2/modules/legislature.ts, src/core2/data/office-day/state-parameters.json

**Notes.** Checklist line from OFFICE-STATE.md; verify against main before starting.
