---
id: core-past-law-enactment-years
title: "Laws in force at the opening carry their real enactment years"
area: core
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The law history (src/core2/past-laws.ts) gives every policy answer in force at the opening an enactment date drawn between 1 and 20 years before day one (pastUndatedLawAgeYearsLow and High, SG-CORE-past-undated-law-age), so a 1947 right-to-work law reads as passed in the 2000s and a 2023 Medicaid expansion can read as fifteen years old. Research the enactment year of each starting-law policy answer for all 56 places into a table keyed by policy question and postal code, starting from data/research/core/state-law-adoption-dates-2025.json, which already holds Medicaid expansion and right-to-work. Then have the law history read that year in place of the seeded age, keeping a seeded range only for answers the research could not date, marked ESTIMATED with its reason.

**Rules.** Estimate, never UNKNOWN: an answer whose year cannot be found keeps a range from the sourced laws' ages, marked ESTIMATED with its source. One rule, all 56 places: the years live in a per-place table, never a state named in logic.

**Done when.** In a one-year buildBenchWorld run of a drawn place (seed named in the PR), the law history record for a dated policy answer (a right-to-work or Medicaid expansion row) carries the researched enactment year by record id, src/core2/past.test.ts passes, and SG-CORE-past-undated-law-age is resolved or narrowed to the answers left undated.

**Files.** src/core2/past-laws.ts, src/core2/data/past/parameters.json, data/research/core/state-law-adoption-dates-2025.json

**Notes.** TODO
