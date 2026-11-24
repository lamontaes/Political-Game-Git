---
id: release-guards-required-checks
title: "Main requires validate and golden-path, and the nightly golden path gives main a verdict"
area: release
kind: feature
priority: 1
size: S
status: done
claimed-by: claude/guards-required-checks
pr: #6493
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T02:40:05.757Z
---

**What.** Main has no branch protection and no rulesets, so a red validate or golden-path never shows as required and a force push or deletion is possible. Sessions cannot set protection: the GitHub proxy refuses the protection API path. The nightly golden-path run on main shares a concurrency group with pushes to main, so every push cancels it and main never gets a golden-path verdict. The owner asked to completely guard the game against what he is trying to do.

**Rules.** Replace, never layer: the settings are written once in docs/release/README.md under Required checks rather than in a second file. One engine per mechanic: the nightly run is the one verdict on main, so the concurrency key keeps it from being canceled by the next push to main.

**Done when.** docs/release/README.md has a Required checks section with the exact settings and the gh command for the owner; .github/workflows/m0-guard.yml keys its concurrency group on the event so a scheduled run on main is not canceled by a push, checked by the test run of tests/american-english.test.ts and prettier on the changed files.

**Files.** docs/release/README.md, .github/workflows/m0-guard.yml

**Notes.** TODO
