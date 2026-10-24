---
id: people-counted-victims-lived-crime
title: "A counted group the crime engine victimizes moves its view on the police by the same rule as a full victim"
area: people
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The crime engine victimizes full households and counted groups by one rule, but only a full household's victimization is a record its members hold (crime.victimized); a counted group's are a tally row per place, month and group. The views engine moves the stance of each full victim the record names, toward the side their own view holds, and reads no tally, so the wider population's view on the police never moves from the crimes it lives. Registered as SG-PEOPLE-counted-victims-lived-crime at the lived reader in src/core2/modules/views.ts.

**Rules.** One model, two tiers: a counted group reached by a lived crime moves by the full victim's rule times its count. Ask why: the group's moved view cites the tally row. No dice: which groups were victimized is the crime engine's own owed-share order, never a roll.

**Done when.** In a one-year buildBenchWorld run in a place drawn from all 56 (place and seed named), a counted group the crime engine victimized has its view on the police line moved by the full victim's rule times its tally's count, citing the tally row id, and filling in a member of that group gives a person whose view matches it; src/core2/views-counted-victims.test.ts proves it and fails when the counted step is removed.

**Files.** src/core2/modules/views.ts,src/core2/modules/crime.ts

**Notes.** Found Oct 24 by the effects lead when Merger 3 sent back #5895 (web-views-lived-crime-moves-stance), whose full-victim step is on that PR. Sibling of people-counted-readers-stances-from-stories, which is the same gap for printed stories.
