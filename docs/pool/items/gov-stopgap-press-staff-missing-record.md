---
id: gov-stopgap-press-staff-missing-record
title: "Stopgaps in press-staff (missing-record): 1 open"
area: gov
kind: stopgap
priority: 2
status: done
claimed-by: claude/gov-press-staff-households
pr: #4565
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/press-staff.ts, kind missing-record"
claimed-at: 2026-10-16T02:48:54.763Z
---

**What.** An outlet's generated reporters each live alone in their own household with no rent, living costs or family, as the core's identity fill-in makes them, so their pay piles up as cash (SG-PEOPLE-press-staff-households, `press-staff.ts` line 179). Give each press person a household drawn the way the opening draws any household of their age and pay in the town, with rent, living costs and kin. The player would notice that the reporter he talks to has a spouse or a rent to pay and is not oddly rich.

**Rules.** One model, two tiers: a press person's household is drawn by the same builder and rule as any household of that age and pay, so they are a consistent member of their group; No dice: the household is drawn from the place's population shares, with no roll deciding an actor's outcome; Wire to the world: the household's rent and costs move money in a generated world; One rule, all 56 places: no place named; household shapes come from place data; Estimate, never UNKNOWN: an unknown rent starts from the place's average marked ESTIMATED; Placeholders: the row closes only when staff households exist; Replace, never layer: the lone-person household stand-in is deleted.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): every press person on the town's outlets has a household with a dwelling, a rent or mortgage, and kin by record id, and their cash no longer grows without bound over the year; the row closes. Tests beside `src/core2/press.test.ts`. The owner plays it: clicks the editor and finds a family and a home.

**Files.** src/core2/press-staff.ts, src/core2/population.ts, src/core2/modules/residents.ts, src/core2/data/stopgaps.json

**Notes.** First row: An outlet's generated people each live alone in their own household with no rent, living costs or family, as the core's identity fill-in makes them, so their pay piles up as cash.
