---
id: play-stop-32-town-list-county-label
title: "A town list row says which county a same-named town is in without reading as that county's population"
area: play
kind: bug
priority: 2
size: S
status: done
claimed-by: play-first/play-stop-32-town-list-county-label
pr: #6248
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T06:21:26.161Z
---

**What.** The town list shows "Aaronsburg, Pennsylvania" and under it "Centre County, 718 people". The county is there only to tell two Aaronsburgs apart, but it runs straight into the count and reads as "Centre County has 718 people". The owner: "Are these the real populations? Like, I don't think there's 718 people in Centre County, Pennsylvania" and then "Yes, I guess we have to delineate between county and city or whatever." This item separates the two: the county as its own labeled part ("in Centre County") and the count attached to the town. The population values do not change.

**Rules.** Serves LAW.md §1, Screens and menus and LAW.md, Conflicts, Populations on the town list (the list shows the count the world opens with, from the one source the world builds from; the owner ruled census figures are calibration only: "the census stuff doesn't have to be literal"). This is a game, not a spreadsheet. Estimate, never UNKNOWN: the count stays a value the world opens with.

**Done when.** In the town list of a drawn state that has two towns with one name, each such row shows its county as its own labeled part and the count as the town's own, checked by a test in src/bench/creator-towns-population.test.ts over the rendered row parts (the county and the count are separate elements and the count sits with the town name), and the count still equals the opening population of that town, shown by a screenshot of the two same-named rows with the place and seed named.

**Time box.** 1 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Two towns with one name read as "Aaronsburg, in Centre County" and "718 people" in two clear parts, so no one takes 718 for the county.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/creator.ts, src/bench/play.mjs, src/bench/play.css, src/bench/creator-towns-population.test.ts, src/bench/towns.browser.mjs

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "Yes, I guess we have to delineate between county and city or whatever." Not filed on purpose: a population-accuracy item. The owner ruled the census is calibration only ("remember, oh my God, the census stuff doesn't have to be literal. It's just calibration."). For the record, boroughs read Census Vintage 2025 estimates (data/tables/place-population.json) and CDPs read ACS 2020-24 (data/research/money/place-population-acs-2024.json), and the list and the opened world share one source. The county was added by play-stop-14 (done). New owner instruction in playtest; CTO to record in OWNER-DECISIONS.md. Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
Merged Oct 27 in PR #6248; awaiting the owner's installed-build check
