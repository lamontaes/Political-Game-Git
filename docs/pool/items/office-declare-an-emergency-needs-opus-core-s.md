---
id: office-declare-an-emergency-needs-opus-core-s
title: "Declare an emergency (needs OPUS-CORE's disasters engine, PR no. 4125)."
area: office
kind: feature
priority: 2
status: in-pr
claimed-by: claude/declare-emergency
pr: #5134
blocked-on:
milestone:
after: core-disasters-ss-prices
source: "docs/coordination/OFFICE-LOCAL.md line 32 (unchecked checklist line)"
claimed-at: 2026-10-19T19:54:01.773Z
---

**What.** Checked against main on Oct 16: OPEN, and waiting on disaster records: there is no declaration or hazard record in core2 yet (`core-disasters-ss-prices`, #4125, is in a PR). The owner deferred the governor's emergency and Guard powers (Oct 14). Next: A `declare-emergency` act that cites a hazard record and the law row, and moves a budget line. The player would notice the act on the politics screen as a choice among people, never a form.

**Rules.** An effect is a read, not a record: the budget, the executive's powers and the response read the declaration record at the moment they spend or act; Ask why: a declaration keeps the hazard record and the law row it cites; The chain is the acceptance: follow one hazard to the declaration, the aid spending, a household's repair or relief and the news line; One rule, all 56 places: which powers an emergency unlocks is law data for all 56 places; No dice: a disaster comes from the hazard record (a cause), not a monthly chance; This is a game, not a spreadsheet: one choice for the player: declare or not; No hand-written player text: the announcement is worded by the English engine; Placeholders: any stand-in crisis list stays registered until real records replace it.

**Done when.** After the disaster records merge: in a drawn place (buildBenchWorld, seed named in the PR body) a declaration cites a hazard record id and the law row id, and a budget line moves by record id; a test beside the office-day tests covers it. The owner plays it: A `declare-emergency` act that cites a hazard record and the law row, and moves a budget line.

**Files.** src/core2/office-day-acts.ts, src/core2/modules/executive.ts, src/core2/modules/budgets.ts, src/core2/health-hazard.ts

**Notes.** Checklist line from OFFICE-LOCAL.md; verify against main before starting.
Sent forward as of 2026-10-15: the disasters engine PR #4125 is carried by core-disasters-ss-prices.
