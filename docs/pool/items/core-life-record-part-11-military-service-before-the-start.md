---
id: core-life-record-part-11-military-service-before-the-start
title: "The life record, part 11: a past holds military service and discharge, at the veteran shares by age and cohort"
area: people
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: lives
model: sonnet
effort: high
root: design-life-record
source: gap sheet, Nov 12, 2026 (Fable A), filed by the Life records builder opus-lr
checked: opus-lr 2026-11-12
---

**What.** The owner, Nov 8: "None of my history is simulated." No past holds military service, so nobody in a town has served, though about one adult in sixteen is a veteran (gap sheet, Nov 12, row 4). Service shapes when work starts and who a person knows. Seen: a veteran's card and the Journal, which tell the years served.

**Cause.** Found in code: no writer of the past (`src/core2/past-*.ts`, `src/core2/modules/people.ts` `openWholePast` line 577) writes service, and no parameter table holds a veteran share. `src/core2/past-work.ts` `entryOf` dates the first civilian job from school's end with no gap for service.

**Fix.** Research first (skill `researcher`): the share of adults who are veterans by sex, age and state (ACS table S2101) and the usual length of a first enlistment, as SOURCED rows in `src/core2/data/past/parameters.json`. Then, when a person is opened, a seeded line against their cohort's share says whether they served; the years run from the end of high school (`schoolingEndsOf` in src/core2/past-work.ts, from #8927) for the enlistment's length, written as `military.enlisted` and `military.discharged` records, and the work pass starts their first civilian job after discharge. The life table tells them as `service/enlisted` and `service/discharged`; the card names the spots for Story.

**Time box.** 1 hour of research and 5 hours of building, Sonnet.

**Rules.** No dice: seeded generation of who existed; the share checks totals. Research calibrates and adds no step to the player's life. Story writes the lines.

**Done when.** A test in three drawn places opens every town adult and prints the share who served by age band against the place's state share (within its spread); every service record has a year and is on the person's `lifeOf`; no first civilian job begins during service. A second session sees one veteran's card on main tell the service with years.

**Waits on.** #8927 (part 9, school's end) on main. Lines from Story for the spots the pull request names.

**Files.** src/core2/past-school.ts, src/core2/past-work.ts, src/core2/modules/people.ts, src/core2/data/past/parameters.json, src/core2/data/life/remembered.json, src/bench/card.ts
