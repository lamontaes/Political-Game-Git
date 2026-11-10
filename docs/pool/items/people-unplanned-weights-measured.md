---
id: people-unplanned-weights-measured
title: "The five unplanned-pregnancy weights are run across their windows in drawn places and their spreads become measured"
area: people
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after:
standard: 2
lead: lives
model: sonnet
effort: medium
root: none
source: stand-in triage, Nov 10, 2026 (SG-PEOPLE-unplanned-calibration; replaces the dropped people-unplanned-calibration)
claimed-at:
---

**What.** The weights that decide how likely an unplanned pregnancy is, how often it is accepted, and how distance and money hold a woman back from ending one are hand-set. Their spreads are guesses. Measure how the town's unplanned pregnancies and endings move across each weight's window and compare with the state's published rates.

**Cause.** Found in code: src/core2/births-unplanned.ts lines 95 and 155 (marker SG-PEOPLE-unplanned-calibration) read renewalUnplannedExposure, renewalUnplannedAcceptance, renewalEndingBase, renewalTravelWeight and renewalTravelHalfMiles from src/core2/data/renewal/parameters.json, all TUNABLE with unmeasured windows.

**Fix.** In three drawn places run one played year each with every weight at the two ends of its window (one change at a time, one run each, no repeat medians), report unplanned pregnancies and endings per 1,000 women 15 to 44 against the state's published rates (CDC, Guttmacher, fetched and quoted), write each parameter's spread as the measured window, and narrow or resolve the stopgap. Real rates check totals; they never pick one woman's outcome.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building. No dice. One rule, all 56 places: drawn places named with seeds. Estimate, never UNKNOWN: each weight keeps its value with the measured window. One run, one number.

**Done when.** A second session finds in at least three drawn places (place and seed named, buildBenchWorld, one played year each) the rate for each weight at both ends of its window against the state's rate, each of the five parameters' spread naming that measured window, and SG-PEOPLE-unplanned-calibration resolved or narrowed to what remains in src/core2/data/stopgaps/people.json.

**Waits on.** Nothing.

**Files.** src/core2/births-unplanned.ts, src/core2/data/renewal/parameters.json, src/core2/data/stopgaps/people.json

**Notes.** The earlier item people-unplanned-calibration was dropped without the standard; this one replaces it.
