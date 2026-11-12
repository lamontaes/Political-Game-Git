---
id: people-partnership-rates-check
title: "A played year's partnerships, separations and leavings per thousand residents are checked against CDC and ACS rates"
area: people
kind: wiring
priority: 3
size: S
status: dropped
claimed-by:
pr:
blocked-on:
after: people-partnership-counted
source: added with npm run pool -- add
claimed-at:
standard: 2
model: sonnet
effort: medium
root: none
lead: lives
checked: fable 2026-11-10
---

**What.** Full people now partner, separate and (once built) leave home in play, so a played year's totals can be checked against real rates. Run a year of the played world in six drawn places and count, per thousand residents of the right age band, young adults leaving a parent's home, new partnerships and separations. Compare them with the ACS share of 25 to 34 year olds living with a parent, the CDC marriage and divorce rates per thousand, and the ACS marital events in the last year (B12503, B13010), and tune only the weights that lie outside them.

**Cause.** Found in code: scripts/core2-year/moves-rate-check.ts (bandOf, line 24, and its age bands) is the model; the weights live in src/core2/data/opening-partnership.json; no script compares a played year's partnerships to CDC and ACS rates.

**Fix.** Write scripts/core2-year/partnership-rate-check.ts printing leavings, partnerships and separations per thousand in six drawn places against sourced figures, tune only weights whose totals fall far outside, record each weight's checked spread in its parameter row, and add the test.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: every figure cites its source, year and spread, and real rates check totals and never decide one actor's outcome. No dice: tuning changes a weight, never adds a random step. One rule, all 56 places: the check draws places from all 56 and names each place and seed. Every number lives in the parameter table, tagged SOURCED, ESTIMATED or TUNABLE with the spread it was checked against.

**Done when.** A second session runs the script for six places drawn from all 56 with seeds the builder did not choose (a one-year buildBenchWorld run) and sees each rate per thousand printed beside its sourced figure with the right age-band denominator. src/core2/partnership-rates.test.ts reads the parameter rows by id and checks the rates are computed from records (the totals reported, not a pass mark on a real range), and weights are tuned only where totals fall far outside, with each checked spread recorded in its parameter row.

**Waits on.** people-partnership-counted (the counted part only; full people can start now).

**Files.** scripts/core2-year/partnership-rate-check.ts (new), src/core2/data/opening-partnership.json, src/core2/partnership-rates.test.ts (new)

**Notes.** Follows people-partnership-counted. The weights in the parameter file are TUNABLE with their baselines marked in the stopgap rows SG-PEOPLE-home-leaving-weights, SG-PEOPLE-partnership-weights and SG-PEOPLE-separation-weights; the rates are the data that retire them.

Oct 20 (pool feeder): spec written; scripts/core2-year/moves-rate-check.ts exists on main as the model for the script; the partnership parameter file and rows come from the unmerged partnership stack, so this waits on people-partnership-counted (and through it the leaving, forming and ending items).

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have checked a year's partnerships and separations against CDC and ACS rates; a check of a number no player sees.
