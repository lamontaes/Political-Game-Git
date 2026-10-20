---
id: office-the-budget-season
title: "The budget season:"
area: office
kind: feature
priority: 2
status: in-pr
claimed-by: claude/political-game-pool-yucp92-tt
pr: #5533
blocked-on:
milestone:
source: "docs/coordination/OFFICE-LOCAL.md line 30 (unchecked checklist line)"
claimed-at: 2026-10-20T05:00:27.877Z
---

**What.** The local budget is passed without a season: the executive's proposal is not an act at its time of year and the council's budget hearing is not on the calendar. Add the budget season: the mayor or executive proposes the budget at the time the body's data sets, the council holds a hearing on the calendar, and the player acts at each step. The player would notice the proposal arriving in its month, a public hearing with speakers, and the vote that sets next year's lines.

**Rules.** One rule, all 56 places: fiscal year and hearing rules come from place data for all 56 places; An effect is a read, not a record: the council reads the proposal and the hearing reads the lines, and the treasury reads the passed budget at the moment it pays; Ask why: the executive's changes and the council's amendments keep reasons by record id; The chain is the acceptance: follow one budget line from proposal to hearing to vote to the payment that changed and a person it reached; This is a game, not a spreadsheet: each step is one choice at its time, not a form; No dice: the executive's proposal follows requests and revenue, not a roll; No hand-written player text: the hearing and results are worded by the English engine; Replace, never layer: the old budget-passing shortcut is deleted.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): the executive's proposal act, the hearing on the calendar and the budget vote occur in their season (act, meeting and bill ids), and a treasury payment in the next months reflects an amended line. Tests beside `src/core2/office-day-calendar.test.ts` and `executive.test.ts`. The owner plays it: as mayor, sends a budget and watches the council amend it.

**Files.** src/core2/modules/office-day.ts, src/core2/office-day-calendar.ts, src/core2/modules/executive.ts, src/core2/data/legislature/executive-proposal.json

**Notes.** Sent back 2026-10-20 from PR #5217 (branch claude/political-game-pool-udtiwn): merge conflict with origin/main in code (src/core2/modules/office-day.ts and src/core2/office-day-acts.ts); finish on that branch, merge main into it first. Checklist line from OFFICE-LOCAL.md; verify against main before starting.
