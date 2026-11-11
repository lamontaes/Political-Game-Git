---
id: web-vehicle-miles-to-traffic-deaths
title: "Miles driven per resident move traffic deaths through a researched outcome-web link"
area: laws
kind: research
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The outcome web now keeps `traffic.vehicle-miles`, miles driven per resident, for all 56 places, and a mileage fee moves it. More miles mean more crashes, but no link carries miles driven to traffic deaths or injuries, so a law that changes driving changes no one's safety. Research the size (deaths per mile driven and how they scale with miles), and link it where a measure of traffic deaths exists or should be kept.

**Cause.** Found in code: data/research/outcome-web/links.json has the link speed-limit-to-traffic-deaths (line 572) and a link into traffic.vehicle-miles (line 6076) but none from traffic.vehicle-miles to a kept traffic-death measure; the miles are kept (data/research/outcome-web/place-outcome-bases-2024.json, line 3870), so a mileage change moves no one's safety.

**Fix.** Research deaths per mile driven and how deaths scale with miles (fetch and quote), add the link to links.json with its range, have an engine read the measure, and show the month row move with the miles in a drawn place.

**Time box.** 5 hours for one Sonnet session.

**Rules.** Research before building: fetch and quote every source; research calibrates and never decides who is hurt. One rule, all 56 places. Estimate, never UNKNOWN.

**Done when.** A second session plays one year of buildBenchWorld in a drawn place (place and seed named), changes the miles driven, and sees the traffic-death measure's month row move with the miles, by record id, with a sourced link from traffic.vehicle-miles in data/research/outcome-web/links.json and an engine reading that measure.

**Waits on.** Nothing.

**Files.** data/research/outcome-web/links.json, data/research/outcome-web/place-outcome-bases-2024.json

**Notes.** Found by the laws lead's helper on `claude/web-vehicle-miles-traveled-per-resident`, Oct 25. Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10): it researches a link to traffic deaths, a measure nobody shows, so a mileage fee changes no one's safety on any screen.
