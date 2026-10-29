---
id: tooling-ci-main-validation-hourly
title: "The CI queue: main's full validation and M0 guard run hourly, not on every push; pull requests keep every check"
area: release
kind: bug
priority: 1
size: S
status: done
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** At thirty merges an hour the Actions queue reached 85 runs on 12 runners (Oct 28, 4:30 PM Eastern); the Mac package's publish job waited two hours. Every push to main ran Deterministic validation (ten jobs) and M0 guards again, though the merged pull request had already run both on the merged result. Both move to an hourly schedule plus manual dispatch on main; pull requests are unchanged; the Release workflow still builds and typechecks every push to main.

**Rules.** Speed: the queue must never hold a merge's verdict for hours, so main runs the full suites once an hour. Branch protection keeps requiring validate and golden-path on pull requests. The red-main owner reads the hourly runs and the Release runs. No test is skipped or weakened.

**Done when.** validate.yml and m0-guard.yml carry no push trigger and an hourly cron; a pull request still shows every test job (validate, guards, unit, repository, scope, golden-path and M0 guards); the queued-run count an hour after the change is under 30 (gh api, named in the Notes).

**Files.** .github/workflows/validate.yml,.github/workflows/m0-guard.yml

**Notes.** lead: cto. Filed by the CTO on the owner's order (Oct 28, 4:40 PM Eastern).
