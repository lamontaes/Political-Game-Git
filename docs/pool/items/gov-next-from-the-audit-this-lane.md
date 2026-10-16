---
id: gov-next-from-the-audit-this-lane
title: "Next from the audit, this lane:"
area: gov
kind: feature
priority: 2
status: in-pr
claimed-by: claude/gov-audit-triage
pr: #4527
blocked-on:
milestone:
source: "docs/coordination/OPUS-GOV.md line 65 (unchecked checklist line)"
claimed-at: 2026-10-15T23:38:25.437Z
---

**What.** OPUS-GOV's checklist line names audit defects 11, 12, 13, 14, 16 and 24 as the next work for the government lane, but the audit text lives in docs/coordination/OPUS-GOV.md and its audit report, and the numbers mean nothing without it. Read each of the six defects against main, mark any that are already fixed, and split each unfixed one into its own small pool item with a done-when of its own. The player would notice nothing until the split items land, so this item is the triage that makes them buildable.

**Rules.** Look before you ask: read DECISION-REGISTER.md and OWNER-DECISIONS.md and search docs/ for each defect before filing it; quote an existing ruling instead of opening a question; Wire to the world: each split item names the module it wires and the record another engine reads; Placeholders: an unfixed defect that is a shortcut gets a registered stopgap row, not a silent note; Ask why: each defect's item says why it happens by file and line, or 'not found'.

**Done when.** Each of defects 11, 12, 13, 14, 16 and 24 is either marked fixed on main with the commit or test that fixed it, or split into a pool item with a what, rules, done-when and files of its own; the OPUS-GOV.md checklist line is struck and this item is set done. Check by running `npm run pool -- --check` and reading the six ids in the index. The owner plays it: nothing directly; he sees six small items in the index instead of one list of numbers.

**Files.** docs/coordination/OPUS-GOV.md, docs/pool/items/

**Notes.** Checklist line from OPUS-GOV.md; verify against main before starting.
