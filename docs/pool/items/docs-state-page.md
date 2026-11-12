---
id: docs-state-page
title: "docs/STATE.md is the one page that says where the game stands, every line sourced"
area: docs
kind: cleanup
priority: 2
size: S
status: done
claimed-by: lane-5/state-page
pr: #7146
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-03T22:27:23.360Z
---

**What.** No one page says where the game stands: the furthest step a player reaches, the newest build, who owns what and whether the pool's claims are true are spread across the leads channel, CREW.md, the pool and the roadmap. The owner reads several files to learn what he can play, and stale claims make open work look taken. Lane 5's unit 2 makes docs/STATE.md that page, with a source on every line.

**Rules.** Ask why: every line on the page names the record or run it comes from, and nothing is stated that a run or a record does not show. Look first: the furthest step comes from the newest recorded play, not a guess.

**Done when.** docs/STATE.md on main names the furthest step with its source and date, the newest build from package.json, the lanes that own the work, and the pool corrections of Nov 3 with the commit that made them; a test checks the page exists and every bullet names a source.

**Files.** docs/STATE.md

**Notes.** TODO
