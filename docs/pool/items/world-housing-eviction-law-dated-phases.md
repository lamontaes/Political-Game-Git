---
id: world-housing-eviction-law-dated-phases
title: "A place's eviction steps change on the day its new eviction law takes effect"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The housing engine reads one undated row of eviction steps per place from src/core2/data/housing/housing.json, so a statute that changes the notice, cure, hearing or stay after the game opens on January 20, 2025 can never take effect. The research already records such changes as dated laterLaw rows in data/research/world/eviction-statute-reads-2026.json: Hawaii's notice goes from five business days to ten calendar days on February 5, 2026 and back on February 4, 2028, Texas requires a pay-or-vacate notice and a statutory trial window from January 1, 2026, and the District's notice drops from 30 to 10 days and its summons from 30 to 14 days on December 31, 2025. Give the eviction table dated phases the way src/core2/data/laws/starting-law.json rows carry effectiveDate and endDate, and have the steps read when a notice is served use the phase in force on that day.

**Rules.** One rule, all 56 places: phases are data rows for every place, read by one date rule, never a state named in logic. An effect is a read: an eviction case must record the phase it followed, and a law the player passes through the laws engine later should replace the place's phase the same way. Estimate, never UNKNOWN: a place with no later law keeps its single phase.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) an eviction case's law record names the phase in force on its notice date by record id, a test in src/core2 serves notices before and after a dated phase in one drawn place and gets each phase's days, and scripts/research/housing-check.ts checks the phases against the research file.

**Files.** src/core2/modules/housing.ts, src/core2/data/housing/housing.json, data/research/world/eviction-statute-reads-2026.json, scripts/research/housing-check.ts

**Notes.** TODO
