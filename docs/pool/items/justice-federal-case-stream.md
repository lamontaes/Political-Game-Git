---
id: justice-federal-case-stream
title: "A federal case stream from BOP and Sentencing Commission data, so mandatory minimums have a reader"
area: world
kind: feature
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Federal laws (mandatory-minimums, drug sentencing) reach nobody: justice.ts has no federal court or federal defendants, so the outcome-web links mandatory-minimums-to-incarceration and mandatory-minimum-cut-to-federal-prisoners move nothing (SG-LAWS-federal-position-no-reader). data/research/justice/bop-federal-offenses-2026.json holds BOP's sentenced stock by offense (152,107 in custody, fetched Nov 8 2026). Add a federal case stream through the existing justice case flow: yearly federal convictions by offense, sentence lengths from the Sentencing Commission, so the stock reproduces BOP's table; then let the mandatory-minimum question set the floor the sentencing step reads.

**Rules.** No dice. One engine: justice.ts case flow, not a second court system. Sizes SOURCED with citation. Counted cases use the same rules as named ones. Still needed: the Sentencing Commission's yearly sentenced-offender counts and average sentence by offense (ussc.gov quick facts; the guessed URL 404'd, find the real link).

**Done when.** A played world in two random places shows federal convictions each year by offense with sentences, a federal prison stock within 10 percent of the BOP table by offense after ten years, and with the mandatory-minimum question enacted by a real bill the sentencing floor changes and the checker grades its reach; SG-LAWS-federal-position-no-reader loses this question.

**Files.** src/core2/modules/justice.ts, data/research/justice/bop-federal-offenses-2026.json, src/core2/modules/laws.ts

**Notes.** Found by the Dev Tester, Nov 8 night. BOP figures fetched; USSC figures still to fetch.
