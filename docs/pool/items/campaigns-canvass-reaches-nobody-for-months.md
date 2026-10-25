---
id: campaigns-canvass-reaches-nobody-for-months
title: "A weekly canvass reaches nobody for months: the eldest-first walk puts every door that opens into the first weeks of each pass"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Anson, Texas with the playtest's seed, a candidate who knocks 49 doors every Sunday from January 2025 reaches 49, 49, 45, 34 and 9 people in the first five weeks, then nobody at all from week 5 to week 22, while the door count keeps growing. The campaign walks the oldest households first (SG-GOV-campaign-walk-order), and only older residents score above zero on the door-opening rule, so every opener in town is used up early. Once every door has been knocked the walk goes round again (play-campaign-doors-go-round-again) and the same pattern repeats: 30 to 49 reached for three weeks, then none for weeks 30 to 40 and 52 to 60. The playtest on v0.22.10, before the eldest-first walk, saw 5 or 6 reached every week.

**Rules.** Sliding scales and causes: whether someone opens the door slides with their traits, age and whether they are home, and a canvass of a town reaches some people most weeks, not all at once and then none. No dice: no draw decides who opens. Look before you ask: the walk order is an open owner decision (SG-GOV-campaign-walk-order); follow the CTO's ruling that it stays until the engine reads a route from the map, or bring the evidence to the owner.

**Done when.** A test in src/core2/campaign-day.test.ts, in a place drawn from all 56 with its seed named, canvasses every week for a year after filing and shows people reached on most weeks (no run of more than four weeks with nobody reached while doors are knocked), and the field contact rate check in src/core2/campaign-calibration.test.ts still passes.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-day.ts, src/core2/data/stopgaps.json

**Notes.** Found Oct 25 by the speed lead while fixing play-stop-25 (branch claude/play-stop-25-door-count). Probe: weekly Sunday canvass in Anson (4803372, seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213), people reached by doors per week: weeks 0 to 4: 49, 49, 45, 34, 9; weeks 5 to 22: 0; weeks 23 to 26: 30, 49, 49, 34; weeks 30 to 40: 0. Lead: m0-m2 (owner of the walk-order stand-in).
