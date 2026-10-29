---
id: release-audit-04-close-5019-stopgap-line
title: "Close #5019 as superseded and fix the SG-WORLD-department-government line number (#4984)"
area: release
kind: bug
priority: 2
size: S
status: dropped
claimed-by: claude/peaceful-ritchie-03780x
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:20:56.076Z
---

**What.** The Oct 20 merge audit (item 4) found that PR #4984 left the stopgap row SG-WORLD-department-government in src/core2/data/stopgaps.json naming a line where its marker no longer sits, and that PR #5019 is superseded by #5044. Correct the row's line to the marker's real line, and close #5019 with a one-line comment naming #5044. Run the stopgap tripwire test so it shows the marker at the named line and fails when the line is wrong.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** The fix is merged, the audit report line for it is marked fixed with the PR number, and the changed test fails when the subject it needs is absent, shown by a test run with a drawn place and seed. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/data/stopgaps.json

**Notes.** Item 4 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes. Released from idle draft #5076 by the CTO, Oct 26.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): already built.
