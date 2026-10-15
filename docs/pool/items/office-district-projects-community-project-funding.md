---
id: office-district-projects-community-project-funding
title: "District projects (community project funding):"
area: office
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/OFFICE-FEDERAL.md line 20 (unchecked checklist line)"
---

**What.** A member of Congress cannot request district projects (community project funding), because an appropriation with a named recipient government does not exist in the legislature's records. Add the named-recipient line to appropriations (a House member requests, the committee includes or drops it, the law funds it), and in the office day let the member request a project for his district. The player would notice a request he made for a local road or clinic appearing in the spending bill and the money reaching that town.

**Rules.** An effect is a read, not a record: the appropriation reads the member's request and the recipient government's treasury reads the grant when it is paid; Ask why: an included or dropped request keeps the committee's reasons by record id; The chain is the acceptance: follow one request to the bill line, the grant to the recipient treasury, the contractor and a resident who uses the result; No dice: inclusion follows the member's standing, committee and party, never a roll; One rule, all 56 places: requests and recipients come from government data for all 56 places; This is a game, not a spreadsheet: one choice with the project, no form; No hand-written player text: the request and result are worded by the English engine; Placeholders: SG-OFFICE-FED-* stand-ins stay registered until replaced.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): the bench player as a House member requests a project, the spending bill carries or drops it with reasons, and a funded grant reaches a named recipient treasury and a named contractor (request, bill line, grant and journal ids). Tests beside `src/core2/office-day-federal.test.ts` and `legislature.test.ts`. The owner plays it: gets a bridge funded for his district and sees it built.

**Files.** src/core2/office-day-federal.ts, src/core2/modules/legislature.ts, src/core2/modules/budgets.ts, src/core2/data/legislature/bill-catalog.json

**Notes.** Checklist line from OFFICE-FEDERAL.md; verify against main before starting.
