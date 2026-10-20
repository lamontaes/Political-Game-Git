---
id: release-figures-declaration-red
title: "release:check fails on main: the people-figures-v2-saved declaration is impact none but carries a section and title"
area: release
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/fix-figures-declaration
pr: #5126
blocked-on:
source: found by release:check while splitting gov-world-standins-oct14
claimed-at: 2026-10-19T19:55:28.695Z
---

**What.** `npm run release:check` fails on main: docs/release/changes/people-figures-v2-saved.md (from #5123) says `impact: none` but also carries `section` and `title`, and a change with no player-visible effect must not carry them. Its own text says the game does not show the figures yet, so the impact is right and the two header lines are wrong. Remove them so the release gate passes again for every branch started from main.

**Rules.** Replace, never layer: the declaration is corrected in place, not given a second one. Red main comes first: the fix is on its own pull request and nothing else rides on it.

**Done when.** On a branch from main, `npm run release:check -- --mode pr` passes with the corrected declaration in docs/release/changes and no other change, and the Release run on main after the merge is green; the test is the release gate itself, run on a branch with a record id of this declaration.

**Files.** docs/release/changes/people-figures-v2-saved.md

**Notes.** Found Oct 19 when `release:check` failed on a branch with nothing else changed.
