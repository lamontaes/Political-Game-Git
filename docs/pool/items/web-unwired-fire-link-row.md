---
id: web-unwired-fire-link-row
title: "Main's unwired list lacks the new fire-spending link's row, so its test is red"
area: world
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The laws lead's justice family added the outcome link fire-spending-to-fire-deaths to data/research/outcome-web/links.json without rerunning the outcome web's writers. The link does not reach anyone, since no engine keeps fire.civilian-casualties, and it has a reason. But src/core2/data/outcome-web/unwired.json has no row for it and src/core2/data/stopgaps.json no SG-WEB-unread-fire-civilian-casualties row, so src/core2/outcome-web-unwired.test.ts fails on main and the effect matrix counts one link not reaching with no stopgap.

**Rules.** An effect is a read, not a record: a link that reaches no one keeps a specific stopgap row. Never delete stopgap rows. Regenerate with the repository writers, never by hand.

**Done when.** On main, node --import tsx scripts/outcome-web/write-coverage.ts, write-unwired.ts (twice) and effect-matrix.ts --out docs/reports/effect-web-matrix-2026-10-20.json leave the unwired list, stopgaps and matrix with a row for fire-spending-to-fire-deaths; src/core2/outcome-web-unwired.test.ts and outcome-web.test.ts pass; the matrix's notReachingAndNoStopgap is 0.

**Files.** src/core2/data/outcome-web/unwired.json,src/core2/data/stopgaps.json,docs/reports/effect-web-matrix-2026-10-20.json

**Notes.** TODO

Oct 29 (CTO, second account): PR #6141 closed as stale under the owner's standing approval; back to open. Branch `claude/web-unwired-fire-link-row` is kept; claiming this item takes it over.
