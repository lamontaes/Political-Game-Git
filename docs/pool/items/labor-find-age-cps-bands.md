---
id: labor-find-age-cps-bands
title: "How finding work slows with age is fitted band by band to the published weeks out of work, not one guessed elasticity"
area: core
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: researcher
standard: 2
model: sonnet
effort: low
root: none
source: stand-in triage of labor.json, Nov 10, 2026 (SG-LABOR-find-age-estimated)
---

**What.** How much slower an older person finds work is one number (an elasticity of 0.4 above age 40), fitted to two age bands and the all-ages mean. The younger age bands were never on file. Fetch the Bureau of Labor Statistics table of mean and median weeks out of work by age band, keep it as data, and fit the curve band by band.

**Cause.** Found in code: `findAgeFactor` in src/core2/past-work.ts (line 340 to 349) raises age over `pastWorkFindAgeReferenceYears` to the power of minus `pastWorkFindAgeElasticity`; src/core2/data/parameters.json (line 7181) says the 25-54 bands are not on file.

**Fix.** Fetch BLS CPS table cpsaat31 (weeks of unemployment by age), quote the band means, save them to data/research/labor/ (new file), and refit `pastWorkFindAgeReferenceYears` and `pastWorkFindAgeElasticity` so the curve tracks every band within the published spread. Update both parameter rows' citation, tag and spread. If one curve cannot track all bands, say so in Notes and keep the closest. No new mechanic.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Research before building: real data checks the simulation and never decides an outcome. SOURCED values quote a fetched page (skill `researcher`). No dice.

**Done when.** A second session opens the new data file and the two parameter rows, confirms the band means against the cited BLS page, and runs the past-work tests plus scripts/world-proofs/jobs-24-months.ts in a drawn place and a seed nobody chose (both named), seeing the mean weeks out of work for ages 20 to 24, 35 to 44 and 55 to 64 land within the published bands.

**Waits on.** Nothing.

**Files.** src/core2/past-work.ts, src/core2/data/parameters.json, src/core2/data/stopgaps/labor.json, data/research/labor/cps-2024-employment-by-age.json
