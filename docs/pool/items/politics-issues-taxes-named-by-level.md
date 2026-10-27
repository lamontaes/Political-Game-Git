---
id: politics-issues-taxes-named-by-level
title: "Issues calls a combined federal and state income tax a local one, and its level rows name no government"
area: laws
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/issues-tax-levels
pr: #6047
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T16:00:20.256Z
---

**What.** Politics → Issues shows each tax as the law in force across every level, so an income tax card adds the federal and state top rates and a sales tax card adds the state rate and the local average. The card took its title from the bill catalog's name for a city bill, Local income tax rate, so a Texas town read 'Local income tax rate 37% top rate' though Texas has no income tax and the 37 percent is the federal top rate. The level rows under it said only Federal or State, and the later phases said only a date. This is the buildable half of play-stop-06-texas-shows-local-income-tax, which stays open for the owner's installed-build check.

**Rules.** One rule, all 56 places: the names come from the catalog and the place's own seats, never a named state in code. Ask why: each number is traceable to the law row and the government that sets it. No hand-written player text beyond control names.

**Done when.** In a played world (buildBenchWorld, two-level) in a drawn place named with its seed, no Issues card for a law set at several levels is titled Local, and every level row of every law names the government that sets it or, for a stand-in row, what it stands for; in a drawn Texas town the income tax shows no state or local rate above zero; a test in src/bench proves both and fails with main's catalog names; bench screenshots of Issues in a Texas town and one other drawn state are in the PR.

**Files.** src/core2/data/legislature/bill-catalog.json, src/bench/government.ts, src/bench/play.mjs

**Notes.** TODO
