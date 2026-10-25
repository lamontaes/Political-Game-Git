---
id: people-opening-pregnancy-first-year-calibration
title: "Opening pregnancies match the place's live-birth pregnancy share without a surveyed rate deciding anyone"
area: people
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/modules/renewal.ts reconstructs the pregnancies already under way at the opening from each couple's current money, housing, health and temperament, run through both partners' chooser at past review dates, because the opening population has no dated history before day one. On a given day about 3.9% of women 15 to 44 nationally carry a pregnancy that will end in a live birth (the place's NCHS 2024 fertility rate times the median 268 days from ovulation to birth), 2.2% to 5.7% across the 56 places, in data/research/core/opening-pregnancy-2024.json. Give the reconstruction a dated pre-opening history (or a reconstruction the CTO accepts) and check the town's opening pregnancies and first-year births against that band, by tier. Closes SG-M1-opening-pregnancies.

**Rules.** No dice: who is pregnant at the opening comes from each couple's own chooser plan, history and conditions, never a draw against the 3.9% share. Research before building: the share is a band the year run checks the town against and never a chance one woman follows.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and seed named in the PR), scripts/research/core-year.ts prints the town's opening pregnancies as a share of full-person women 15 to 44 inside the place's band from data/research/core/opening-pregnancy-2024.json, naming three pregnancy record ids, and deliveries in the first nine months are not bunched on one date.

**Files.** src/core2/modules/renewal.ts, src/core2/renewal.test.ts, data/research/core/opening-pregnancy-2024.json, scripts/research/core-year.ts, src/core2/data/stopgaps.json

**Notes.** TODO
