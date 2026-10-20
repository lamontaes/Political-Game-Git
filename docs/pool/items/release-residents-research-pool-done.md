---
id: release-residents-research-pool-done
title: "Residents research umbrella marked done after only its county-employment part merged"
area: release
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The item research-residents-sourced-parameters is marked done by PR #5690, whose body explicitly delivers only the county-employment row and leaves the other rows unfinished. District placement remains on open PR #5698, and the cadence research is still described as open. A completed umbrella hides that remaining work from the pool, although its done-when requires every listed row and a played-world band report.

**Rules.** The pool is the only backlog: unfinished source rows must remain visible as open work, and a partial merge must not complete their umbrella. Research before building: retain the original citation, reader and generated-world requirements when splitting the remaining work.

**Done when.** Restore the umbrella to the status its outstanding rows require, or split those rows into explicit open items and link them from its Notes; verify every remaining stopgap has an open item with the original test and played-world proof requirements, and pool --check adds no failures for the edited items.

**Files.** docs/pool/items/research-residents-sourced-parameters.md, docs/pool/INDEX.md, src/core2/data/stopgaps.json

**Notes.** Found during merger review; #5690 was merged by another merger at c4d6a3e42c6d1d8f89a2cac617dc58537bb894b6. Preserve that merge history; this item repairs tracking for the unfinished rows.
