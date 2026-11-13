---
id: release-main-red-guards-after-8329
title: "Main is red under two guards after #8329 merged with no guard run: a deep import and a table missing from the daily register"
area: release
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: cto
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
claimed-at:
branch: claude/red-main-guards-after-8329
---

**What.** The guards job is red for every pull request because two guards fail on main since #8329 (other states' budgets read the country tier's ledgers). tests/guards/families.test.ts reports src/core2/modules/outside-budgets.ts importing src/core2/country-model.ts from inside another family, and tests/guards/daily-register.test.ts reports no kept-table line for outside-budgets.shares (Calvin, Louisiana, DAILY_REGISTER_SEED=81a5e00eb1eed458). Merger codex-1251 found both on #7365 and #8580. Guards: the next pull request's guards job runs green so the owner's builds keep shipping. Guards: the other states' budgets the news and comparison screens read keep loading and shipping.

**Cause.** Found in code: src/core2/modules/outside-budgets.ts line 21 imports the CountryState type from ../country-model, a file of the jobs-businesses family that is not its entry, and its module state declares a shares table (function sharesOf) that docs/design/daily-register.md does not list. #8329 merged with no guard run.

**Fix.** Import the type through src/core2/modules/macro.ts, which is the jobs-businesses family's entry and already re-exports CountryState; add the outside-budgets.shares line to Kept tables in docs/design/daily-register.md with its measured rows (one row per state, written once, never rewritten or dropped, so flat). No baseline is raised and no allow-list widened.

**Time box.** 1 hours

**Rules.** Red main comes first. Replace, never layer: no alias or second import path. The register line states the table as the code keeps it.

**Done when.** A second session runs npm run guards on main with DAILY_REGISTER_SEED=81a5e00eb1eed458 and with a fresh seed, in the drawn place each names, and both families and daily-register pass; the other states' budget rows still read the tier in a played year.

**Waits on.** Nothing.

**Files.** src/core2/modules/outside-budgets.ts, docs/design/daily-register.md

**Notes.** Released by next (2026-11-13): no push to claude/red-main-guards-after-8329 since 2026-11-12 18:40 UTC, more than twice its 1-hour time box. Continue on branch claude/red-main-guards-after-8329.
