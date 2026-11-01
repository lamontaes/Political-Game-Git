---
id: finance-close-employer-no-current-receipt
title: "A played world dies in Superior, Colorado: closeEmployer finds no current unfunded obligation receipt"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Superior, Colorado (GEOID 0875640, place seed a352f38e75486e3885a7fdd8f2dc6c1112a2e6da7628ff7c20dc4aca4c849a54, drawn by salt incumb-B:2, purpose incumbency-totals, scripts/core2-year/place.ts drawPlace) a played world with every module installed (buildBenchWorld, bookkeeping off) throws 'Closure requires an actual current unfunded obligation receipt.' at src/core2/finance-state.ts closeEmployer within three years. Stack: state.ts, finishFinanceDay, modules/finance.ts onAfterDay, life.ts runDay, advanceCore. Found by the governing lead's Runner B, Nov 1 16:18 UTC; repro: node --import tsx scripts/core2-year/incumbency-totals.ts --seed incumb-B --places 3 --years 3 crashes on the third place after about 17 minutes.

**Rules.** No dice; one rule for all 56 places; a firm closes only from a recorded unfunded obligation, never by a thrown error; replace never layer

**Done when.** The Superior, Colorado world runs three years with no throw; the closure either has its receipt or does not happen, proved in the played world by record id; the cause is named

**Files.** src/core2/finance-state.ts,src/core2/modules/finance.ts

**Notes.** Filed by red main from the governing lead's report. Reproduce on main first with the seed above.
