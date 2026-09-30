---
id: wave1-towns
impact: patch
section: Fixed
title: Towns keep enumerated residents when a population survey reports zero
---

Adds verified Census population and demographic inputs for counties, places,
and Island Areas, plus pure population readers and an explicit saved-layer
writer. Concho preserves a positive enumeration when its ACS survey is zero.
Source vintages and Island Areas universes remain in the data. Missing or suppressed raw observations stay unknown. The world layer uses
seeded distributions from nationally comparable places for opening counts.
Ta’ū county/MCD and Chalan Kanoa I–IV are explicitly recorded calibration
anchors, never exact observations of an unqualified village.

Adds a shared income reader that distinguishes recurring compensation from
actual irregular-pay receipts and recognizes exact biweekly cadence.
Game population and demographic readers fill missing fields from national
comparables while preserving raw missing cells and real enumerated zeros.
World-aware town rosters use generated population and household totals;
released public-body staffing and local-election roster readers pass World.
Existing saved opening values and read purity are preserved. Required cloud
types/tests and the unowned source-classification adapters are pending; this
continuation is work in progress. Household evolution, the remaining law-stack
adapters and income consumers follow separately.
