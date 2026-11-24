---
id: speed-year-gila-bend-year-two-runs-ten-times-the-bar
title: "A year in Gila Bend, Arizona takes about 650 seconds in year 2 and 940 in year 3 against a 120-second bar"
area: core
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: speed
source: "Account lead F1, Nov 14, 2026, timing #9078 and #9085 on the train"
model: opus
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** One played year in Gila Bend, Arizona (0427050, seed 5d20e6b3f9) takes 123 s in year 1, 644 s in year 2 and 942 s in year 3 on `npm run speed:year`, against the owner's bar of two minutes a country's year (Oct 29). A player who lets this town run waits ten minutes a year, and the records kept double from year 1 to year 2. Seen: the dev-mode date-advance call for this place takes minutes, and the time is spent in the year after the first.

**Cause.** Measured: on the train head 532d9303920eeb76718cc3a1e454414a8307fc88, seed 5d20e6b3f9, three years: year 1 123.2 s with 512,892 records, year 2 644.3 s with 999,827 records, year 3 942.3 s with 1,393,955 records (64 to 68 s per 100k records against 12 to 25 s per 100k in Buck Creek, Indiana and Forest, Mississippi on the same code). The largest table in all three years is `core2-coverage-v1` medical coverage rows. Same numbers on #9078's head (124.8, 667.1, 931.1 s) and #9085's head (121.3, 698.9, 957.3 s), so neither PR causes it. Not yet found: which engine's step grows with those coverage rows; profile year 2 with scripts/speed-years/profile-year.ts by function.

**Fix.** Profile Gila Bend year 2, name the function that grows with the coverage rows, and replace its scan with an index or act on the day a row changes (skill `speed-work`, `cadence-and-summaries`); fold old coverage rows into summaries once nothing reads them.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push the profile and what is found, set the state honestly with a one-line note, and stop.

**Rules.** Speed (owner, Oct 29): a country's year under two minutes, and no change slows a year more than 20%. One run, one number; no repeat medians.

**Done when.** A second session, not the builder, runs `npm run speed:year -- --seed 5d20e6b3f9 --years 3` on main in the drawn place Gila Bend, Arizona and in one place nobody chose, and each year takes under 120 s with the record counts near the base numbers named in the cause.

**Waits on.** Nothing.

**Files.** src/core2/modules/coverage.ts, scripts/speed-years/profile-year.ts
