---
id: release-lane-status-declaration
title: "Status-only lane updates do not block the release declaration gate"
area: release
kind: bug
priority: 1
size: S
status: done
claimed-by:
pr: #6119
blocked-on:
source: added with npm run pool -- add
lead: m0-m2
---

**What.** Main Release 40255594061 failed declaration enforcement on a progress-only lane update. Its exact incoming range ca33ef650a9933763728d6f3fea976c728ed2c34..27bc8b1f74da09d580b51719579ab4605afcdf8a changed docs/play-first/PROGRESS.md without a declaration. CTO PR #6119 repairs that specific incident; this bounded completion item keeps it separate from the concurrently claimed desktop-staging incident in release-main-red.

**Rules.** Red main comes first. Replace, never layer: update the existing transition filter and workflow exclusions only for the three explicitly named status paths; retain declaration enforcement and ordinary client rejection tests, with no parallel release writer or skipped client validation.

**Done when.** The exact failed range reproduces as a declaration failure on clean main and passes with the repair locally. Changed release tests pass, including status-only handling and ordinary client rejection; all three named status files are excluded from status-only workflow triggers while mixed client commits still trigger. The PR records its checked head, Done-when table and own local checks. The shared release-main-red claim for a different incident is preserved.

**Files.** .github/workflows/release.yml, scripts/release/transition.ts, tests/release/declaration-transition.test.ts, tests/release/release-workflow.test.ts

**Notes.** Merger 2 completed #6119 at merge bbd235cbbb032c7f4f92a8faf5eca8d0c93216d0, pinned checked head d52e21a96f5329bd5c05608bc213c39895f75729. Own type355.91s, changed lint/format including YAML, 32/32 tests in two changed files, zero-dice and release PR check pass; pool4136bytes exactly baseline. Exact failed range exits1 on clean main and0 with the repair. The concurrent Merger0 claim on release-main-red for #6071 and its platform follow-up remain untouched.
