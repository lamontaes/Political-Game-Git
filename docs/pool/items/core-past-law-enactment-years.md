---
id: core-past-law-enactment-years
title: "Laws in force at the opening carry their real enactment years"
area: core
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: rc9-place-facts-one-default
lead: laws
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The law history (src/core2/past-laws.ts) gives every policy answer in force at the opening an enactment date drawn between 1 and 20 years before day one (pastUndatedLawAgeYearsLow and High, SG-CORE-past-undated-law-age), so a 1947 right-to-work law reads as passed in the 2000s and a 2023 Medicaid expansion can read as fifteen years old. Research the enactment year of each starting-law policy answer for all 56 places into a table keyed by policy question and postal code, starting from data/research/core/state-law-adoption-dates-2025.json, which already holds Medicaid expansion and right-to-work. Then have the law history read that year in place of the seeded age, keeping a seeded range only for answers the research could not date, marked ESTIMATED with its reason.

**Cause.** Found in code: src/core2/past-laws.ts lines 476 to 477 and 628 give every undated policy answer an enactment age between pastUndatedLawAgeYearsLow and pastUndatedLawAgeYearsHigh (stopgap SG-CORE-past-undated-law-age in src/core2/data/stopgaps/core.json), so a 1947 right-to-work law can read as passed in the 2000s.

**Fix.** Build a table of enactment year by policy question and postal code for all 56 places starting from data/research/core/state-law-adoption-dates-2025.json (Medicaid expansion, right-to-work), read it in src/core2/past-laws.ts in place of the seeded age, and keep the seeded range only for answers research could not date, marked ESTIMATED with the reason. Resolve or narrow SG-CORE-past-undated-law-age to the answers left undated.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN: an answer whose year cannot be found keeps a range from the sourced laws' ages, marked ESTIMATED with its source. One rule, all 56 places: the years live in a per-place table, never a state named in logic. Research before building: the sourced years set the dates and never decide one actor's outcome.

**Done when.** A second session, not the builder, plays a one-year buildBenchWorld in a drawn place and a seed it chose and opens the law history: a right-to-work row and a Medicaid expansion row carry the researched enactment year, shown by record id, and an undated answer is marked ESTIMATED. src/core2/past.test.ts passes, and SG-CORE-past-undated-law-age is resolved or narrowed to the answers left undated.

**Waits on.** Nothing.

**Files.** src/core2/past-laws.ts, src/core2/past.test.ts, src/core2/data/past/parameters.json, src/core2/data/stopgaps/core.json, data/research/core/state-law-adoption-dates-2025.json

**Notes.** From the laws thread's dev-mode gap list (Nov 16, 2026; /mnt/project-files/laws/reports/dev-mode-gaps-from-industry-traces.md), a related gap this item does not cover: every state law in force at the opening takes effect on July 1, 2024 in the game, including laws whose real start is in 2025 or 2026, so businesses pay those costs early (factories-freight.md: the consumer data privacy duty at Lebanon, Kentucky, 2144344, seed ind-2144344, cost the plants before the real law starts). Dev mode shows the row's date and not the real one. When this item researches years, the effective date belongs in the same table, and dev mode's law page should show it beside the row's date.
