---
id: release-audit-18-data-verify
title: "Verify the Connecticut due dates, the Michigan row tag and the regenerated business books (#5230, #5274, #5033)"
area: world
kind: bug
priority: 3
size: M
status: done
claimed-by: claude/fs11vb-dataverify
pr: #5512
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T17:20:25.882Z
---

**What.** Check Connecticut property-tax due dates against statute, fix the Michigan row tagged SOURCED whose rule differs for primary-electing cities, and regenerate town-business-books.generated.ts from the script and check the three IRS values.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** Each of the three facts has a citation or a corrected tag in the data, and the regenerated file matches its script, shown by a test that reads each row from a drawn place and seed.

**Files.** data, src/core2/town-business-books.generated.ts

**Notes.** Item 18 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.

Sent back 2026-10-20 from PR #5512 (branch claude/audit-18): the new core2 test imports the IRS table from src/simulation, and the new data citations carry access dates (Oct 19 and Oct 20, 2026); finish on that branch, merge main into it first.
