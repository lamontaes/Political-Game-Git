---
id: web-news-rent-reader-marker
title: "The news list names the engine that reads rent, and its stand-in marker goes"
area: core
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "stand-in triage of the web register, Nov 10 (docs/stopgaps/triage-2026-11-10/web.md)"
claimed-at:
after:
standard: 2
model: sonnet
effort: low
root: rc8-law-judged-by-paperwork
lead: laws-effects
---

**What.** The town hears of a rise in rent from the outcome web's month record, and the housing engine now sets every lease renewal from the web's rent factor, but the news list still says no engine reads it. Point the list at the reader and delete the stand-in marker (SG-WEB-knowing-rent-reader).

**Cause.** Found in code: src/core2/data/news/outcome-news.json (the `housing.rent` entry, line 24) has `readBy: null` and `stopgapId: SG-WEB-knowing-rent-reader`; the reader exists: `renewRentalLeases` in src/core2/housing-occupancy.ts (line 448) calls `webFactorFor(api, placeId, "housing.rent")` and writes the rise into the lease it renews.

**Fix.** In src/core2/data/news/outcome-news.json set the `housing.rent` entry's `readBy` to `src/core2/housing-occupancy.ts` and remove its `stopgapId`. The test in src/core2/outcome-news.test.ts ("lists only measures an engine reads") then reads that file and finds `"housing.rent"` in it. Set SG-WEB-knowing-rent-reader to `resolved` in src/core2/data/stopgaps/web.json with `resolvedAt`, `resolvedBy` and the replacement text the other resolved rows carry.

**Time box.** 1 hour.

**Rules.** Replace, never layer: the marker and the null go in the same change. A stand-in is resolved only when the code that replaced it is named.

**Done when.** The register row is resolved, outcome-news.json has no `readBy: null` for rent, and a second session plays a drawn place (place and seed named) in which rent rises in the web's month record and sees the news story of the rise and, in the same world, a renewed lease at the higher rent, by record id.

**Waits on.** Nothing.

**Files.** src/core2/data/news/outcome-news.json, src/core2/data/stopgaps/web.json, src/core2/outcome-news.test.ts, src/core2/housing-occupancy.ts
