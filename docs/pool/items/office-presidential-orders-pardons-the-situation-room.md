---
id: office-presidential-orders-pardons-the-situation-room
title: "Presidential orders, pardons, the situation room:"
area: office
kind: feature
priority: 2
status: open
claimed-by:
pr: #5184
blocked-on:
milestone:
source: "docs/coordination/OFFICE-FEDERAL.md line 19 (unchecked checklist line)"
claimed-at:
---

**What.** Checked against main on Oct 16: OPEN. `presidentialOrders`, `pardonable` and `crisesToday` in `office-day-federal-president.ts` all return nothing, each registered as a stopgap (`SG-OFFICE-FED-presidential-orders`, `-pardons`, `-situation-room`); the justice engine has no federal sovereign to pardon. Next: A federal executive order whose law row an agency or the budget engine reads. Pardons and the situation room wait on a federal-sovereign record in justice and on crisis records. The player would notice the act on the politics screen as a choice among people, never a form.

**Rules.** An effect is a read, not a record: agencies read the order at the moment they act, the court and prison read the pardon, and the situation room reads crisis records; Ask why: each order and pardon keeps reasons and the law row cited by record id; The chain is the acceptance: follow one order to the agency's changed rule, the payment or enforcement that changed and a person reached; No dice: when the player does not choose, the character decides from traits and the law, not a roll; One rule, all 56 places: powers come from federal law data; This is a game, not a spreadsheet: each power is one choice at its moment; No hand-written player text: orders and briefings are worded by the English engine; Placeholders: the two SG-OFFICE-FED rows close only when real records are read.

**Done when.** In a drawn place (buildBenchWorld, seed named in the PR body) an `order:` record's law row is read by an agency or budget engine and changes a record by id, tested in `src/core2/office-day-federal.test.ts`. The owner plays it: A federal executive order whose law row an agency or the budget engine reads.

**Files.** src/core2/office-day-federal-president.ts, src/core2/modules/executive.ts, src/core2/modules/justice.ts, src/core2/data/office-day/federal-cabinet.json

**Notes.** Checklist line from OFFICE-FEDERAL.md; verify against main before starting.
