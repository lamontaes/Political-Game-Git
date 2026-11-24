---
id: release-guards-screen-rulings
title: "The bench browser checks hold the title menu and People screen rulings"
area: release
kind: feature
priority: 1
size: S
status: done
claimed-by: claude/guards-screen-rulings
pr: #6510
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T03:25:23.195Z
---

**What.** The owner's screen rulings of Oct 27 (no text under a title entry, no Family tab on People, no box around a person, one Continue on a narration-only beat, the date and time in the bottom-left card) are checked by hand only. Two of them already have browser checks: the talk box narration beat and the card. The others regress without anyone noticing.

**Rules.** Replace, never layer: each ruling is added to the existing browser check for its screen, not a new suite, and none is checked twice. No hand-written player text in code: the title entries are their names and nothing else.

**Done when.** src/bench/clock.browser.mjs asserts every title entry shows only its name once a life is saved, and src/bench/people.browser.mjs asserts no Family tab and no box around any person; both were run against a bench in a drawn place, named in the PR body, and fail on the defects still on main.

**Files.** src/bench/clock.browser.mjs, src/bench/people.browser.mjs

**Notes.** TODO

Oct 29 (CTO): set done; PR #6510 merged (the done flip failed while branch protection refused the flip job's push).
