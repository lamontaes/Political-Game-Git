---
id: release-main-red-scan-dir
title: "Main is red: release build cannot write test-results/data-shipping-scan.json on a fresh checkout"
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

**What.** npm run build ends with check:data-shipping writing test-results/data-shipping-scan.json; test-results/ is gitignored so the packaging job's fresh checkout lacks it and fails with ENOENT (release run 40426609860 on main).

**Rules.** Fix at the writer; change nothing else.

**Done when.** check-data-shipping.mjs creates the report folder; tests/source/data-shipping.test.ts fails on main and passes on the branch.

**Files.** scripts/world/check-data-shipping.mjs, tests/source/data-shipping.test.ts

**Notes.** TODO
