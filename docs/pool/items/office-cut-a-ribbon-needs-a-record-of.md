---
id: office-cut-a-ribbon-needs-a-record-of
title: "Cut a ribbon (needs a record of a finished public project; none exists)."
area: office
kind: feature
priority: 2
status: in-pr
claimed-by: claude/public-project-ribbon
pr: #5132
blocked-on:
milestone:
source: "docs/coordination/OFFICE-LOCAL.md line 33 (unchecked checklist line)"
claimed-at: 2026-10-19T19:41:04.629Z
---

**What.** Checked against main on Oct 16: OPEN. There is no public project record: public works are budget lines that pay town businesses by share (`budgets-treasury.ts`), and the only project record is private housing (`housing.ts` `ProjectRow`). Next: A public project record: a budget line becomes a project with contractor payments, finishes on a date and emits a record the office day reads for a ribbon-cutting act. The player would notice the act on the politics screen as a choice among people, never a form.

**Rules.** Wire to the world: the project moves money from the treasury to contractors and ends as a place change, proven in a generated world; An effect is a read, not a record: the office day reads the finished-project record at the moment the project finishes; The chain is the acceptance: follow one budget line to the contractor payments, the finished project, the ceremony, the news line and the people who use it; This is a game, not a spreadsheet: the ceremony is a stop the player may skip; it adds no form; One rule, all 56 places: projects and their costs come from budget and place data, with no place named in code; No dice: completion follows the funded work and time, not a roll; No hand-written player text: the ceremony and the news line are worded by the English engine; Placeholders: any stand-in project record is registered.

**Done when.** In a drawn place (buildBenchWorld, seed named in the PR body) a budget line produces a `project:` row with contractor payment record ids that finishes on a date, and a test shows the office day offering the ribbon-cutting act citing that record. The owner plays it: A public project record: a budget line becomes a project with contractor payments, finishes on a date and emits a record the office day reads for a ri.

**Files.** src/core2/modules/budgets.ts, src/core2/office-day-acts.ts, src/core2/modules/office-day.ts, src/core2/modules/housing.ts

**Notes.** Checklist line from OFFICE-LOCAL.md; verify against main before starting.
