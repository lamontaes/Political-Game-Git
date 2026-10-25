---
id: campaigns-canvass-reaches-nobody-for-months
title: "A weekly canvass reaches nobody for months: the eldest-first walk puts every door that opens into the first weeks of each pass"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #6065
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In Anson, Texas with the playtest's seed, a candidate who knocks 49 doors every Sunday from January 2025 reaches 49, 49, 45, 34 and 9 people in the first five weeks, then nobody at all from week 5 to week 22, while the door count keeps growing. The campaign walks the oldest households first (SG-GOV-campaign-walk-order), and only older residents score above zero on the door-opening rule, so every opener in town is used up early. Once every door has been knocked the walk goes round again (play-campaign-doors-go-round-again) and the same pattern repeats: 30 to 49 reached for three weeks, then none for weeks 30 to 40 and 52 to 60. The playtest on v0.22.10, before the eldest-first walk, saw 5 or 6 reached every week.

**Rules.** Sliding scales and causes: whether someone opens the door slides with their traits, age and whether they are home, and a canvass of a town reaches some people most weeks, not all at once and then none. No dice: no draw decides who opens. Look before you ask: the walk order is an open owner decision (SG-GOV-campaign-walk-order); follow the CTO's ruling that it stays until the engine reads a route from the map, or bring the evidence to the owner.

**Done when.** A test in src/core2/campaign-day.test.ts, in a place drawn from all 56 with its seed named, canvasses every week for a year after filing and shows people reached on most weeks (no run of more than four weeks with nobody reached while doors are knocked), and the field contact rate check in src/core2/campaign-calibration.test.ts still passes.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-day.ts, src/core2/data/stopgaps.json

**Notes.** Found Oct 25 by the speed lead while fixing play-stop-25 (branch claude/play-stop-25-door-count). Probe: weekly Sunday canvass in Anson (4803372, seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213), people reached by doors per week: weeks 0 to 4: 49, 49, 45, 34, 9; weeks 5 to 22: 0; weeks 23 to 26: 30, 49, 49, 34; weeks 30 to 40: 0. Lead: m0-m2 (owner of the walk-order stand-in).

Oct 25 (claude/door-answer-age-gradient, released): measured why only older residents open, which is also tests-campaigns-candidate-doors-reach-nobody-oakley's cause. The door rule in walkDoors (src/core2/modules/campaigns.ts) opens when leanedScore(campaigns.open-door) of (age - 55) / doorAnswerAgeSpan - doorAnswerThreshold is above zero. Over 12 places drawn from all 56 (seeds doorcal:0 to doorcal:11, 13,618 adults), the personality term runs only from -0.06 (5th percentile) to +0.11 (95th), so age decides. Share of adults who would open, by age band, at settings inside the parameters' spreads: span 40, threshold 0.46 (now): 12.9% of adults, 0% at 18-35, 35-55 and 55-70, 78% at 70 and over; span 80, threshold 0.2: 17.9%, 0%, 0%, 13%, 89%; span 60, threshold 0.3: 14.3%, 0%, 0%, 3%, 82%. No setting in range lets anyone under 55 open, so an eldest-first walk spends every opener in its first weeks, and a town with no one past about 70 (Oakley, Wyoming) gets no contact at all, against a field contact rate of a quarter to a third of doors. The fix needs a cause that varies between people beyond age and this personality term (for example political interest, or knowing the candidate or canvasser, each with a researched size) or a change to the walk order (SG-GOV-campaign-walk-order, which the CTO kept until a map route exists). That is the m0-m2 lead's or the owner's call, not a tuning of these two parameters.

Merger 1, 2026-10-25 23:28 UTC: PR #6065 corrective reached-count fix passes own integrated static gates, six campaign tests, 97.0→100.3 s sequential speed and affected-control browser check. Linked primary remains open for declared owner full-window screenshot approval and automatic approval review rejection of the plain PR integration push (comment 6404880707); no merge or done flip, no renewed allegation of the repaired reached-count defect.
