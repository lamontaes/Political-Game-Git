---
id: play-filing-check-form-not-on-party-joined
title: "filing.browser.mjs: the form does not start on the party joined, on some drawn places"
area: play
kind: bug
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/bench/filing.browser.mjs fails with 'the form does not start on the party joined' on some drawn places and passes on others. On clean origin/main it failed in Belle Rose, Louisiana and passed in East Hampton, Neligh and Sandpoint (1 of 4). On the screens/one-left-menu branch it failed in Newcastle, Wyoming and passed in Round Lake (1 of 2). Found by Merger 4 on Oct 27 while merging PR 6389, which did not cause it.

**Rules.** No dice; the place stays drawn from all 56 and the check must not be pinned to a place to pass.

**Done when.** The filing browser check passes on eight consecutive fresh drawn places, with Belle Rose, Louisiana and Newcastle, Wyoming among those replayed through the check's seed override, and the cause of the form starting somewhere other than the party joined is named by file and line.

**Files.** src/bench/filing.browser.mjs

**Notes.** Found Oct 27 by Merger 4; flaky on clean main (about one draw in four).

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): twin of `tests-filing-browser-go-times-out-on-main`; close into it and carry any line it lacks there. (same filing.browser.mjs flake)
