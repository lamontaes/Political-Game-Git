---
id: screens-no-family-tab
title: "People has no separate Family tab; family is a filter on the map"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: screens/no-family-tab
pr: #6477
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T01:52:18.350Z
---

**What.** The owner at 9 PM on Oct 27, relayed by the CTO, said there shouldn't be a separate family tab when you can sort by family. The Family tab only showed each relative standing in a room picture, with raw place kinds like house-suburban-living. Family is already one of the people map's filters.

**Rules.** Replace, never layer: the tab, its sheet, its endpoint and its styles are deleted, not hidden; one way to each screen (screen-to-mock): family is reached through the map's filter only.

**Done when.** In a drawn place (name the place and seed), src/bench/people.browser.mjs and src/bench/sheets.browser.mjs pass on a restarted bench with no Family tab on People; before and after screenshots are in the PR body.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/handler.ts, src/bench/family.ts

**Notes.** CTO relay 01:05 UTC Oct 28. lead: play-first.
