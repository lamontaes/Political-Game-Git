---
id: gov-standin-withholding-residence
title: "Payroll withholding reads the worker's residence law and the local tax base from the law rows"
area: gov
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: split from gov-standins-other (Oct 19, 2026); rows SG-WORLD-withholding-residence-law, SG-WORLD-withholding-local-base, SG-WORLD-withholding-nonresident-local
---

**What.** Withholding for a worker who lives outside the town does not read the residence state's law, a local flat tax is taken on gross pay with no exemptions, and nonresidents pay no local income tax. Replace these so each paycheck withholds under the worker's residence law and the working town's own local tax, using exemptions and adjustments from the law rows and the worker's records. The worker's take-home pay then changes with where they live.

**Rules.** "An effect is a read": the replacement counts only when another engine reads what it writes at the moment it decides or pays. "No dice": traits, law and money decide, never a roll.

**Done when.** A played year in a drawn place, started with buildBenchWorld, shows the replacement read by another engine by record id, a test in a random place of all 56 names the place and seed, and each row (SG-WORLD-withholding-residence-law, SG-WORLD-withholding-local-base, SG-WORLD-withholding-nonresident-local) is resolved in src/core2/data/stopgaps.json with the reason.

**Files.** src/core2/modules/budgets.ts

**Notes.** Split out of gov-standins-other by the session that claimed it (claude/standins-other-credit-business).
