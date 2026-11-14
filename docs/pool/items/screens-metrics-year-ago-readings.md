---
id: screens-metrics-year-ago-readings
title: "The Metrics tab shows last year beside every town and state figure"
area: core
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10
lead: screens
standard: 2
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** Town jobs, rental and claims figures and state figures after the first year show only the current value; this year beside last is missing. Stand-in SG-SCREENS-metrics-no-prior-year. Seen: the Metrics screen's town and state rows.

**Cause.** Found in code: src/bench/metrics.ts:110 and :206 (`before: null` for rentals, vacancies, rent, home value and the jobs counts). The jobs engine and the housing stock keep no year-ago reading, and the regional engine keeps only twelve months plus each December.

**Fix.** Make the world-metrics module (src/core2/modules/world-metrics.ts) keep one reading per month of the town's counts from the opening on, folding months older than thirteen into the December of each year; have the regional engine keep the month a year before each month it shows. Then read `before` from those rows in metrics.ts and delete the null placeholders. Written once a month, by counts; no daily scan.

**Time box.** 6 hours for a Sonnet session.

**Rules.** Replace, never layer: delete the `before: null` rows and the markers in the same change. Speed: monthly, folded; no change may slow a played year over 20%.

**Done when.** A second session opens the Metrics tab in a drawn place and seed nobody chose after one played year and sees last year beside every town figure and, from the second year, every state figure, each matching the module's row named by record id.

**Waits on.** Nothing.

**Files.** src/bench/metrics.ts, src/core2/modules/world-metrics.ts, src/core2/modules/jobs.ts
