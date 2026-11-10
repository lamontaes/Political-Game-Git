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
standard: 2
model: opus
effort: medium
lead: governing
root: rc9-place-facts-one-default
source: split from gov-standins-other (Oct 19, 2026); rows SG-WORLD-withholding-residence-law, SG-WORLD-withholding-local-base, SG-WORLD-withholding-nonresident-local
after:
---

**What.** Withholding for a worker who lives outside the town does not read the residence state's law, and a local flat tax is taken on gross pay with no exemptions. Replace these so each paycheck withholds under the worker's residence law and the working town's own local tax, using exemptions and adjustments from the law rows and the worker's records. The worker's take-home pay then changes with where they live. The nonresident local tax row (SG-WORLD-withholding-nonresident-local) belongs to world-withholding-nonresident-local.

**Cause.** Found in code: src/core2/modules/budgets.ts lines 1732-1743 (SG-WORLD-withholding-residence-law) and line 1848 (SG-WORLD-withholding-local-base) are open in src/core2/data/stopgaps/world.json.

**Fix.** Withhold each paycheck under the worker's residence law and the working town's local tax, using the law rows' exemptions and adjustments, so take-home pay changes with where the worker lives. Leave the nonresident row to world-withholding-nonresident-local.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** "An effect is a read": the replacement counts only when another engine reads what it writes at the moment it decides or pays. "No dice": traits, law and money decide, never a roll.

**Done when.** A second session, in a played year in a drawn place started with buildBenchWorld (place and seed named), finds a worker's withholding changing with the residence law and the working town's local tax, read by another engine by record id (the worker's take-home pay on the journal), a test in a random place of all 56 naming the place and seed, and SG-WORLD-withholding-residence-law and SG-WORLD-withholding-local-base resolved in src/core2/data/stopgaps/world.json with the reason.

**Waits on.** world-commuters-in-opening (open: no full worker lives outside the town in the opening).

**Files.** src/core2/modules/budgets.ts, src/core2/data/stopgaps/world.json

**Notes.** Split out of gov-standins-other by the session that claimed it (claude/standins-other-credit-business).
