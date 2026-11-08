---
id: laws-federal-mandatory-minimums-engine
title: "Engine: sentencing reads a mandatory-minimum law, so reducing minimums reaches sentences"
area: world
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** us-federal-positions:justice-rights.reduce-mandatory-minimums is on the bill menu but the justice engine sets sentences from no minimum, so a law reaches no case (also the web link mandatory-minimum-cut-to-federal-prisoners).

**Rules.** One engine per mechanic: the bill's law row is read by the engine named here at the moment it decides or pays; no dice; every number SOURCED/ESTIMATED/TUNABLE; one rule for all 56 places.

**Done when.** The justice engine reads the minimum in force when it sentences; a played-world year names the cases whose sentence moved by record id in a drawn place.

**Files.** src/core2/modules/justice.ts,src/core2/justice-law.ts

**Notes.** TODO
