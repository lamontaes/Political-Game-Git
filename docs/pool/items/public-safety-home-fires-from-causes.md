---
id: public-safety-home-fires-from-causes
title: "Home fires happen from their causes and are recorded, so the fire department and the paper's fire log have something real to tell"
area: core
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** No engine records a fire. The town paper's police and fire log (words-paper-and-journal-everyday-life, step 3) prints the police half from the crime engine's month record; the fire half has nothing to read, so it never prints. Real fire departments answer structure fires, most of them in homes, and those fires come from causes a home's record can carry: cooking, heating equipment, electrical faults, smoking, the age of the home. Build them as a background simulation from those causes on the housing records, calibrated against the national rate of home structure fires, and record each one with its cause, its home and the household it displaced.

**Rules.** Sliding scales and causes: a fire happens from a hazard the home and household records carry, never a monthly chance. Wire to the world: a fire moves money (repairs, insurance claims) and people (a displaced household), proven in a played year.

**Done when.** In a one-year played run of three places drawn from all 56 (named with place and seed), home fires are recorded with their cause read from the housing records; their yearly count per 1,000 homes falls within the spread of the national rate the item's research cites; and the press prints a month's fires in the police and fire log, checked by a test in src/core2 and by src/bench/printed-words.test.ts.

**Files.** src/core2/modules/public-safety.ts, src/core2/modules/housing.ts, src/core2/modules/press.ts, src/bench/printed-words.ts

**Notes.** Filed by Words (words-paper-and-journal-everyday-life): the fire half of the police and fire log waits on this record. Words wires the log once a fire record exists.
