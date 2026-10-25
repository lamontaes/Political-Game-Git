---
id: play-stop-06-texas-shows-local-income-tax
title: "Issues shows a 37 percent local income tax in Texas"
area: laws
kind: bug
priority: 1
size: S
status: claimed
claimed-by: play-first/play-stop-06-texas-shows-local-income-tax
pr:
blocked-on: politics-issues-taxes-named-by-level
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-10-25T21:04:05.007Z
---

**What.** Politics → Issues in Anson, Texas on the v0.22.10 release reads "Local income tax rate 37% top rate". Texas has no state income tax and Anson no local one; 37 percent is the federal top rate, shown under a local label. The other rows (minimum wage $7.25 an hour, local sales tax 8.201 percent, property tax 1.591 percent of home value) look plausible. A player choosing what to run on would believe the town taxes income at 37 percent.

**Rules.** Serves LAW.md §1, Screens and menus; LAW.md §11, The world on screen makes sense. One rule, all 56 places: the tax rows come from the place's law records at each level and are labeled by the level that sets them. Ask why: each number should be traceable to the law in force it shows.

**Done when.** The owner does the same steps on the next build and is not stopped: in a Texas town, Politics → Issues shows no state or local income tax, and in any drawn place each rate is labeled by the government that sets it. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** In a Texas town, Politics → Issues shows no income tax line, and in any town each rate names the government that sets it.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/core2/modules/laws.ts, src/core2/data/legislature/bill-catalog.json, src/core2/data/laws/starting-law.json, src/bench/government.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:57; screenshot 27. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was effects.
