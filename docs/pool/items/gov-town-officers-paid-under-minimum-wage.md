---
id: gov-town-officers-paid-under-minimum-wage
title: "A small town's officers open as full-time jobs paid under the minimum wage, so a wage raise multiplies their pay"
area: gov
kind: bug
priority: 2
size: M
status: dropped
claimed-by:
pr: #6190
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In Prescott, Michigan (2666300, seed a91c03e7d2b84f10, the laws lead's audit town), the town government's officers open as eight-hour-a-day jobs at a few cents to a few dollars an hour, under Michigan's $10.33 floor: the planning director at $0.81 an hour (`person_a66a51fc6585ef0a`), the chief administrative officer, finance director, city attorney and city clerk at $1.73, the public works director at $3.41 and the fire chief at $10.21 (measured at the opening, Oct 25). A small town's officers are part-time, often paid a stipend, so the pay is right in total but wrong per hour. When a minimum wage rises, the wage engine raises each of them to the new floor (`src/core2/wage-floor.ts:159`), and the core scales the job's daily pay by the ratio of the hourly rates (`src/core2/state.ts:1803`). So a 10% raise of the state wage made the chief administrative officer's biweekly paycheck $363.52 instead of $55.36, and the planning director's $363.52 instead of $25.92 (law-wiring year run, `docs/reports/law-wiring/families/labor-year-US-MI-2666300.json`). Federal wage law also leaves elected officials and their policymaking appointees out of "employee" (29 U.S.C. 203(e)(2)(C), recalled, check before building), so a minimum wage should not reach them at all.

**Rules.** Estimate, never UNKNOWN: an officer's hours and pay start from the place's real figures with a spread and source. One model, two tiers. No dice. One rule, all 56 places: the exemption comes from the law's text in data, not a named state.

**Done when.** In a played year of `buildBenchWorld` in two drawn places (seeds named), including a small town, every officer job holds hours and pay that match its source (a part-time stipend where the place pays one), no officer's hourly pay sits under the floor unless the law exempts the office, and a minimum wage raise in that town leaves exempt officers' pay unchanged while raising covered workers by the floor's change, named by record id. **On screen.** Nothing yet: it would show on Politics → Campaigns and the election night results, and nothing there reads it.

**Time box.** 3 hours. Model: Sonnet, no helpers.

**Files.** src/core2/public-payroll.ts, src/core2/wage-floor.ts, src/core2/state.ts

**Notes.** Found by the laws lead, Oct 25, while tracing why a 10% state wage raise lifted some Prescott paychecks six to fourteen times over. A commuter's job at an outside employer in the same town opened at $5.91 an hour too (`person_02518494bd09c0bd`, the "works outside the town" employer), which the wage engine also raised.
Oct 27 (claude/officer-floor): the exemption half is already on main (070eb9c348, src/core2/wage-floor.ts minimumWageExempt reading src/core2/data/laws/minimum-wage-exempt.json; src/core2/wage-floor-exempt.test.ts raises the floor in a drawn world and checks exempt officers' pay is unchanged). A fresh Prescott, Michigan world (2666300) still opens six town officers (job:public:town:city-administrator, finance-director, public-works, planning, city-attorney, city-clerk, 8.5 hours a day) at $1.07 to $4.50 an hour, under the $10.33 floor, and one commuter job (job:commuter:person_183249e7bf6cd583:2025-01-21, 8 hours, $1.29) at the outside-market employer. What stays open is the other clause: part-time hours or a stipend from a sourced figure for a small town's officers, so the hourly pay is right, not only the total. That needs a source for officer hours or stipends by town size; released unbuilt for the researcher and whoever takes the data.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): twin of `gov-officer-stipend-part-time-hours`; close into it and carry any line it lacks there. (exemption built)
