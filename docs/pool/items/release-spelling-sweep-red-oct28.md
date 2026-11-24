---
id: release-spelling-sweep-red-oct28
title: "The American English sweep is red on main: two British spellings of center in art/people-rooms/README.md (from #6418)"
area: release
kind: bug
priority: 1
size: S
status: done
claimed-by: cto-night/sweep-centre
pr: #6451
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T00:19:08.387Z
---

**What.** tests/american-english-sweep.test.ts fails on main since #6418 (22:20 UTC Oct 27): art/people-rooms/README.md lines 27 and 43 use the British spelling of center. Every PR's unit job carries the failure.

**Rules.** Fix the words, never exempt the file.

**Done when.** npx vitest run tests/american-english-sweep.test.ts passes 12 of 12 on main.

**Files.** art/people-rooms/README.md

**Notes.** TODO
