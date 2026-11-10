---
id: core-opening-profile-attainment-from-schooling
title: "Opening education and faith come from the person's own past, checked against the census and the Religious Landscape Study"
area: core
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: design-life-record
lead: m0-m2
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** Each adult's education and faith at the opening is read from their state's CES 2024 survey shares by age band (src/core2/opening-profile.ts, SG-P15-opening-profile), so a person's degree ignores their own schooling record and their faith ignores the family they grew up in. Derive attainment from the person's school records (school.started and the past-school records) and faith from the household they were raised in, following the approved per-person faith record (handed down in families, changing only through events; DECISION-REGISTER.md). Check the town's totals against data/research/core/acs-2023-b15001-attainment-by-state.json (ACS 2019-2023 B15001) and data/research/core/pew-rls-2023-24-faith-by-state.json (Pew 2023-24), both covering all 56 places. In the Owings, Maryland year (seed 38e6252af62e) the 83 adults of the town were 28.9% Protestant against the Pew Maryland share of 43.3%, and across all 1,729 full adults the bachelor's share ran 4 to 6 points under the ACS at ages 25 to 44.

**Cause.** Found in code: src/core2/opening-profile.ts (the `DATA` and `KEYS` tables, `d`, and the age-band loop at line 82) draws each adult's education and faith from the state's CES 2024 shares for the age band, keyed to the person, and reads neither their school records nor their household. Measured in the item: Owings, Maryland, seed 38e6252af62e, 83 adults 28.9% Protestant against Pew Maryland 43.3%.

**Fix.** Derive attainment from the person's school.started and past-school records (src/core2/past-school.ts, src/core2/shared-history.ts) and faith from the household they were raised in, handed down in families and changing through events. Keep the ACS B15001 and Pew tables as totals checks only. Resolve SG-P15-opening-profile for what this replaces.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the census and Pew shares check the town's totals and never become a draw for one person; a person's attainment and faith follow their own schooling record and household. One rule, all 56 places: both check tables are keyed by postal code for every place, never a state named in logic. Ask why: each person's degree and faith answer why by the school or household record that gave them.

**Done when.** A second session, not the builder, runs a one-year buildBenchWorld in a drawn place and a seed it chose and opens several adults: each person's degree matches their school records and their faith matches the household they grew up in, shown by person and school record ids. The town's bachelor's share by ACS age band and each faith group's share are printed beside the state's B15001 and Pew shares by scripts/research/deep-past-year.ts, reported as figures with the Owings, Maryland seed 38e6252af62e result before and after, not as a pass or fail.

**Waits on.** Nothing.

**Files.** src/core2/opening-profile.ts, src/core2/past-school.ts, src/core2/shared-history.ts, data/research/core/acs-2023-b15001-attainment-by-state.json, data/research/core/pew-rls-2023-24-faith-by-state.json, scripts/research/deep-past-year.ts

**Notes.** TODO
