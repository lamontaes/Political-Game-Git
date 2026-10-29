---
id: release-guards-every-pr
title: "Every standing-rule guard runs on every pull request, and validate requires it"
area: release
kind: feature
priority: 1
size: S
status: done
claimed-by: claude/guards-every-pr
pr: #6492
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T02:36:59.844Z
---

**What.** The guards that hold the owner's standing rules (zero dice, old imports, the tests/guards files, the American English sweep, the canned-content guard, the director's numbers test, the pool check, the secrets scan and the wording ratchet) run only locally or when their own file changes, so a pull request can break a rule without a red check. The owner asked to completely guard the game against what he is trying to do. This item adds one guards job to validate.yml that always runs them all, names the rule and where to read it on a failure, and makes the validate aggregate require it.

**Rules.** One engine per mechanic: the guard list lives in one file, scripts/guards/index.ts, and the job, the local command and the guards doc all read it. Replace, never layer: the guards that were red on main are fixed at the root (the stale counts lowered, the buffer raised) rather than skipped.

**Done when.** The guards job in .github/workflows/validate.yml runs npm run guards on every pull request and push, the validate aggregate fails when it fails (tests/release/validate-workflow.test.ts), scripts/guards/guards.test.ts fails when a test file under tests/guards is not in the list, and all twelve guards pass on main in the PR's test run.

**Files.** scripts/guards/index.ts, .github/workflows/validate.yml, tests/release/validate-workflow.test.ts

**Notes.** TODO
