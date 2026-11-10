---
id: people-counted-victims-lived-crime
title: "A counted group the crime engine victimizes moves its view on the police by the same rule as a full victim"
area: people
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
standard: 2
model: sonnet
effort: medium
root: design-one-model-two-tiers
lead: lives
checked: fable 2026-11-10
---

**What.** The crime engine victimizes full households and counted groups by one rule, but only a full household's victimization is a record its members hold (crime.victimized); a counted group's are a tally row per place, month and group. The views engine moves the stance of each full victim the record names and reads no tally, so the wider population's view on the police never moves from the crimes it lives. Registered as SG-PEOPLE-counted-victims-lived-crime.

**Cause.** Found in code: src/core2/modules/views.ts line 988 marks SG-PEOPLE-counted-victims-lived-crime (row at src/core2/data/stopgaps/people.json line 173): the lived reader moves full victims only, not the crime engine's per-group tally rows in src/core2/modules/crime.ts.

**Fix.** Read the tally rows in the lived-crime step and move each victimized counted group's view on the police by the full victim's rule times its count, citing the tally row id, and mark the stopgap resolved.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted group reached by a lived crime moves by the full victim's rule times its count. Ask why: the group's moved view cites the tally row. No dice: which groups were victimized is the crime engine's own owed-share order, never a roll.

**Done when.** A second session runs a one-year buildBenchWorld in a drawn place from all 56 (place and seed named) and sees a counted group the crime engine victimized have its view on the police moved by the full victim's rule times its tally's count, citing the tally row id, and filling in a member of that group gives a person whose view matches it. src/core2/views-counted-victims.test.ts proves it and fails when the counted step is removed.

**Waits on.** Nothing.

**Files.** src/core2/modules/views.ts, src/core2/modules/crime.ts, src/core2/data/stopgaps/people.json, src/core2/views-counted-victims.test.ts (new)

**Notes.** Found Oct 24 by the effects lead when Merger 3 sent back #5895 (web-views-lived-crime-moves-stance), whose full-victim step is on that PR. Sibling of people-counted-readers-stances-from-stories, which is the same gap for printed stories.

Deferred Oct 25: nothing on screen reads it yet.
