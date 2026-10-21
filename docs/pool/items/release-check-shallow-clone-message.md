---
id: release-check-shallow-clone-message
title: "release:check names the fix when a cloud clone is too shallow to find the base commit"
area: release
kind: bug
priority: 3
size: S
status: done
claimed-by: claude/release-check-shallow
pr: #5290
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:43:04.122Z
---

**What.** In a cloud session the clone is shallow, so `npm run release:check` stops with a bare "Needed a single revision" git error and no hint. The error now adds that the clone may be shallow and names the fix, `git fetch --unshallow origin`. Sessions lose time to this at their first declaration check.

**Rules.** Replace, never layer: the hint is added to the one place that wraps git errors, with no second check elsewhere.

**Done when.** The test in tests/release/declaration-transition.test.ts feeds a comparison commit that does not exist and sees the unshallow hint in the error.

**Files.** scripts/release/transition.ts, tests/release/declaration-transition.test.ts

**Notes.** Found Oct 19 on the first release:check of a cloud session.
