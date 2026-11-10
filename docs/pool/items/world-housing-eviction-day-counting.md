---
id: world-housing-eviction-day-counting
title: "Eviction notice, hearing and stay periods count business, court and holiday-free days where the statute does"
area: world
kind: stopgap
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: laws-effects
model: sonnet
effort: medium
root: none
source: stand-in triage T4 (Nov 10, 2026), docs/stopgaps/triage-2026-11-10/world.md
claimed-at:
---

**What.** The housing engine counts every eviction notice, hearing and stay period in calendar days. Ten statute reads count other days (Alabama, Hawaii, the Northern Marianas, Utah and North Carolina business days; California court days; West Virginia judicial days; the District days without Sundays and holidays), so a tenant there is evicted sooner than the law allows.

**Cause.** Found in code: src/core2/modules/housing.ts lines 1035 and 1036 (stopgap SG-WORLD-housing-eviction-day-counting) return the steps row unchanged, and the periods are added as calendar days at lines 1783 (`addDays` for the notice), 1960 (hearing) and 2485 (stay). The research file data/research/world/eviction-statute-reads-2026.json already records each read's `dayType` (business, court, calendar).

**Fix.** Add a `dayType` to the steps rows in src/core2/data/housing/housing.json from the research file (calendar where none is recorded). Add one helper that adds N counting days to a date, skipping weekends and the place's holidays for a business, court or holiday-free day type, and use it at the three places that add notice, hearing and stay days. Read the place's holidays from the calendar the game already keeps; if it keeps none for a place, count weekends only and register that as a stopgap. Resolve the stopgap row.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the day type is data on the steps row, never a branch that names a state. Placeholders: any shortcut in the holiday list is a registered stopgap. Speed: the helper adds days by a short loop over at most a few dozen days and runs only when a case opens or advances, so a played year costs nothing measurable.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`) in a drawn place whose steps count business days and in a drawn place that counts calendar days (seeds named in the PR body), opens a case in each, and sees the business-day place's notice end after the statute's number of business days (later than the same number of calendar days) by the case's record id, and the calendar place unchanged. SG-WORLD-housing-eviction-day-counting is resolved.

**Waits on.** Nothing.

**Files.** src/core2/modules/housing.ts, src/core2/data/housing/housing.json, data/research/world/eviction-statute-reads-2026.json, src/core2/data/stopgaps/world.json, src/core2/housing.test.ts
