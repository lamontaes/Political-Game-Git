---
id: core-stopgap-rows-never-hit-in-play
title: "101 open stopgap rows never ran in three played worlds over two years each: check each is unreachable in play and resolve or delete it"
area: core
kind: cleanup
priority: 3
size: M
status: blocked
claimed-by: claude/fs11vb-rows-never-hit
pr:
blocked-on: duplicate of core-stopgap-never-hit-audit (pool feeder Oct 20); CTO to drop
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:36:05.434Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Oct 20 (pool feeder): not specced; same job as core-stopgap-never-hit-audit (check each open row whose marker never fired, resolve those whose fake is unreachable), so it duplicates that item. The 101 count here is the same measurement as that item's 80 plus the module-level `stopgap()` calls it names as a blind spot; fold the extra rows into the audit item.
