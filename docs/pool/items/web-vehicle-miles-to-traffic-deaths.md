---
id: web-vehicle-miles-to-traffic-deaths
title: "Miles driven per resident move traffic deaths through a researched outcome-web link"
area: laws
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The outcome web now keeps `traffic.vehicle-miles`, miles driven per resident, for all 56 places, and a mileage fee moves it. More miles mean more crashes, but no link carries miles driven to traffic deaths or injuries, so a law that changes driving changes no one's safety. Research the size (deaths per mile driven and how they scale with miles), and link it where a measure of traffic deaths exists or should be kept.

**Rules.** Research before building: fetch and quote every source; research calibrates and never decides who is hurt. One rule, all 56 places. Estimate, never UNKNOWN.

**Done when.** A sourced link from `traffic.vehicle-miles` to a kept traffic-death measure sits in `data/research/outcome-web/links.json` with its range, an engine reads that measure, and a played year of `buildBenchWorld` in a drawn place (seed named) shows the measure's month row moving with the miles, by record id.

**Files.** data/research/outcome-web/links.json, data/research/outcome-web/place-outcome-bases-2024.json

**Notes.** Found by the laws lead's helper on `claude/web-vehicle-miles-traveled-per-resident`, Oct 25.
