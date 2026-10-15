---
id: office-cut-a-ribbon-needs-a-record-of
title: "Cut a ribbon (needs a record of a finished public project; none exists)."
area: office
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/OFFICE-LOCAL.md line 33 (unchecked checklist line)"
---

**What.** A ribbon cutting needs a record of a finished public project, and none exists: public works are budget lines, not projects with a start and a finish. Build the project record (a funded line item that becomes a finished building, road or park on a date) in the budgets and construction engines, and let the office day offer the ceremony as an act when a project in the official's jurisdiction finishes. The player would notice a new park or bridge opening that his budget vote paid for, with a ceremony he can attend and a news story.

**Rules.** Wire to the world: the project moves money from the treasury to contractors and ends as a place change, proven in a generated world; An effect is a read, not a record: the office day reads the finished-project record at the moment the project finishes; The chain is the acceptance: follow one budget line to the contractor payments, the finished project, the ceremony, the news line and the people who use it; This is a game, not a spreadsheet: the ceremony is a stop the player may skip; it adds no form; One rule, all 56 places: projects and their costs come from budget and place data, with no place named in code; No dice: completion follows the funded work and time, not a roll; No hand-written player text: the ceremony and the news line are worded by the English engine; Placeholders: any stand-in project record is registered.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a funded public project finishes in the year (project, line and contractor payment ids named), the official in whose jurisdiction it sits is offered the ribbon-cutting act, and a news story and a place change (a new park or road) follow. Tests beside `src/core2/office-day-acts.ts` tests and `budgets.test.ts`. The owner plays it: votes for a park and later cuts its ribbon.

**Files.** src/core2/modules/budgets.ts, src/core2/office-day-acts.ts, src/core2/modules/office-day.ts, src/core2/modules/housing.ts

**Notes.** Checklist line from OFFICE-LOCAL.md; verify against main before starting.
