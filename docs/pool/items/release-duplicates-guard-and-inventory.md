---
id: release-duplicates-guard-and-inventory
title: "Every twin already on main is listed, and a guard refuses a new old-engine importer or a second writer of an event kind"
area: release
kind: feature
priority: 1
size: M
status: done
claimed-by: claude/duplicates-on-main
pr: #6455
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T00:16:52.940Z
---

**What.** The owner on Oct 28 had every duplicated mechanic, writer, renderer, bank or unread record already merged found and removed. Nothing blocks a new twin today: npm run old-imports only reports and never fails, and nothing notices a second file emitting an event kind another file already emits. This item lists the pairs on main in docs/reports/duplicates-on-main-2026-10-28.md and adds the guard; the deletions are their own items, one pair per PR.

**Rules.** Replace, never layer: a second writer, engine or renderer is a defect, so the guard refuses a new one and its allow lists only shrink. One source per fact (Oct 27): the inventory names which copy the rulings keep and which readers move.

**Done when.** tests/guards/no-second-source.test.ts fails when a new file imports src/simulation or src/presentation or a second file emits an existing event kind (shown by undoing the baseline in the PR), npm run old-imports exits 1 on a new importer, and docs/reports/duplicates-on-main-2026-10-28.md lists every pair with both files, the kept one and its readers.

**Files.** scripts/core2-guard/old-imports.mjs, tests/guards/no-second-source.test.ts, docs/reports/duplicates-on-main-2026-10-28.md

**Notes.** TODO
