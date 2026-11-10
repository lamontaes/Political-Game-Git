---
id: docs-audit-oct19-report-standard
title: "The Oct 19 audit report breaks the report standard in five places, which fails report-check.test on main"
area: docs
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO Released from idle draft #5180 by the CTO, Oct 26.

Oct 20: Everything it waited on is done, so it is open.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-76ksvw` (2026-10-20). Cleared from the front matter and kept here.

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: drop, already done on main. `node scripts/report-check/cli.mjs docs/reports/audit-2026-10-19.md` and the same on `docs/reports/repo-audit-2026-10-19.md` report 0 errors (17 and 16 warnings only), so report-check no longer fails on them. Checked read-only on Nov 10.
