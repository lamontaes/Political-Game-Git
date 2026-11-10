---
id: public-safety-home-fires-from-causes
title: "Home fires happen from their causes and are recorded, so the fire department and the paper's fire log have something real to tell"
area: core
lead: laws
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
standard: 2
model: opus
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** No engine records a fire. The town paper's police and fire log prints the police half from the crime engine's month record; the fire half has nothing to read, so it never prints. Real fire departments answer structure fires, most of them in homes, and those fires come from causes a home's record can carry: cooking, heating equipment, electrical faults, smoking and the age of the home. Build them as a background simulation from those causes on the housing records, calibrated against the national rate of home structure fires, and record each one with its cause, its home and the household it displaced.

**Cause.** Found in code: `fireService` in src/core2/public-safety.ts (line 1821) pays an uninsured loss from `fireStructureRatePer1000` times households with a per-head accumulator (`carry.fire`); it writes no fire record with a cause, a home or a displaced household, and src/core2/modules/housing.ts has no fire reference.

**Fix.** Record each home fire from causes the home and household records carry (cooking, heating, electrical, smoking, age of home), calibrated so the total matches the national rate, with its home and the household it displaced, and have the press read it for the fire half of the police and fire log (Words wires the log once a fire record exists).

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Sliding scales and causes: a fire happens from a hazard the home and household records carry, never a monthly chance, and real rates check totals but never pick one home's fire. Wire to the world: a fire moves money (repairs, insurance claims) and people (a displaced household), proven in a played year. One rule, all 56 places.

**Done when.** A second session (not the builder) plays a year of `buildBenchWorld` in three places drawn from all 56 (place and seed named) and finds home fires recorded with their cause read from the housing records, each citing its home and the household it displaced and moving money by journal id; the yearly count per 1,000 homes is reported beside the national rate the item's research cites. The press prints a month's fires in the police and fire log (screenshot at 1440x900 of News), checked by a test in src/core2 and by src/bench/printed-words.test.ts.

**Waits on.** Nothing.

**Files.** src/core2/public-safety.ts, src/core2/modules/housing.ts, src/core2/modules/press.ts, src/bench/printed-words.ts, src/bench/printed-words.test.ts

**Notes.** Filed by Words (words-paper-and-journal-everyday-life): the fire half of the police and fire log waits on this record. Words wires the log once a fire record exists.
