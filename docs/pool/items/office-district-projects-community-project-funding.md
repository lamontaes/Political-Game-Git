---
id: office-district-projects-community-project-funding
title: "District projects (community project funding):"
area: office
kind: feature
priority: 2
status: in-pr
claimed-by: claude/community-projects
pr: #5170
blocked-on:
milestone:
source: "docs/coordination/OFFICE-FEDERAL.md line 20 (unchecked checklist line)"
claimed-at: 2026-10-19T21:42:56.395Z
---

**What.** Checked against main on Oct 16: OPEN. No earmark or community-project record exists; appropriations are budget-line changes only (`Provision.kind` budget-line in legislature.ts), and the federal office day has no request act. Next: A member's request for a named recipient: a request record, a line on the appropriations bill naming the recipient government and a grant that lands in its treasury. The player would notice the act on the politics screen as a choice among people, never a form.

**Rules.** An effect is a read, not a record: the appropriation reads the member's request and the recipient government's treasury reads the grant when it is paid; Ask why: an included or dropped request keeps the committee's reasons by record id; The chain is the acceptance: follow one request to the bill line, the grant to the recipient treasury, the contractor and a resident who uses the result; No dice: inclusion follows the member's standing, committee and party, never a roll; One rule, all 56 places: requests and recipients come from government data for all 56 places; This is a game, not a spreadsheet: one choice with the project, no form; No hand-written player text: the request and result are worded by the English engine; Placeholders: SG-OFFICE-FED-* stand-ins stay registered until replaced.

**Done when.** In a drawn place (buildBenchWorld, seed named in the PR body) a request id, a bill line id and a grant journal record to the town treasury are all shown by id, tested in `src/core2/legislature.test.ts`. The owner plays it: A member's request for a named recipient: a request record, a line on the appropriations bill naming the recipient government and a grant that lands i.

**Files.** src/core2/office-day-federal.ts, src/core2/modules/legislature.ts, src/core2/modules/budgets.ts, src/core2/data/legislature/bill-catalog.json

**Notes.** Checklist line from OFFICE-FEDERAL.md; verify against main before starting.
