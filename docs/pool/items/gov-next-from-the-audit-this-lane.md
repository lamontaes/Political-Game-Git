---
id: gov-next-from-the-audit-this-lane
title: "Next from the audit, this lane:"
area: gov
kind: feature
priority: 2
status: done
claimed-by: claude/gov-audit-triage
pr: #4527
blocked-on:
milestone:
source: "docs/archive/2026-10-23/coordination/OPUS-GOV.md line 65 (unchecked checklist line)"
claimed-at: 2026-10-15T23:38:25.437Z
---

**What.** OPUS-GOV's checklist line names audit defects 11, 12, 13, 14, 16 and 24 as the next work for the government lane, but the audit text lives in docs/archive/2026-10-23/coordination/OPUS-GOV.md and its audit report, and the numbers mean nothing without it. Read each of the six defects against main, mark any that are already fixed, and split each unfixed one into its own small pool item with a done-when of its own. The player would notice nothing until the split items land, so this item is the triage that makes them buildable.

**Rules.** Look before you ask: read DECISION-REGISTER.md and OWNER-DECISIONS.md and search docs/ for each defect before filing it; quote an existing ruling instead of opening a question; Wire to the world: each split item names the module it wires and the record another engine reads; Placeholders: an unfixed defect that is a shortcut gets a registered stopgap row, not a silent note; Ask why: each defect's item says why it happens by file and line, or 'not found'.

**Done when.** Each of defects 11, 12, 13, 14, 16 and 24 is either marked fixed on main with the commit or test that fixed it, or split into a pool item with a what, rules, done-when and files of its own; the OPUS-GOV.md checklist line is struck and this item is set done. Check by running `npm run pool -- --check` and reading the six ids in the index. The owner plays it: nothing directly; he sees six small items in the index instead of one list of numbers.

**Files.** docs/archive/2026-10-23/coordination/OPUS-GOV.md, docs/pool/items/

**Notes.** Checklist line from OPUS-GOV.md; verify against main before starting.

**Triage, Oct 15 (claude/gov-audit-triage).** The six defects are from the laws stress audit (`docs/reports/stress-audit-laws-2026-10-14/README.md`). Read against main:

- **11, adopted spending never paid from a treasury: fixed.** `closeTreasuries` (`budgets-treasury.ts`) pays each budget line every month and keeps a `treasury-month` row per government with what each line paid.
- **12, a budget bill with no executive has no lines: fixed.** `councilBudget` (`legislature.ts`) drafts the bill from `departmentRequests` when no executive set priorities.
- **13, outcome landings written and read by nothing: fixed by the rewrite.** The core2 outcome web no longer writes per-person landing records; `electorate-inputs.ts` reads the web's place outcomes.
- **14, the ordinance's duty and law facts read by nothing: open.** Filed as `gov-reach-rows-read-by-an-engine`.
- **16, "adopt an income tax" records people reached when it writes no tax: fixed.** The act now reaches people only through a tax it wrote (`law-reach/group-b.ts`); Columbus, Ohio went from 191 reached to 0.
- **24, ordinance rows marked sourced, and the changes screen showing no one: fixed, and half was never a defect.** The row is now an estimate that cites the tunable delay (`enactLaw` takes an `estimate` flag). The screen showing no one reached for the three county laws was correct: they are the first three of the audit's "laws that change nothing anywhere", each under a registered stopgap (SG-GOV-REACH-A-citizenship, -B-medicaid-coverage, -B-preschool-enrollment).

Fixed lines are read from the code, not re-run.
