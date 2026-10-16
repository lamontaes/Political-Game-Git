---
id: web-gov-measures-read
title: "The outcome web reads the government measures"
area: world
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `govMeasure(api, measure)` (gov-measures.ts, ten measures) is called only by its test. Have the engine-measure branch of outcome-web.ts (`readEngine`) call it for any measure in `GOV_MEASURES`.

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a one-year run of a drawn place an outcome moved by a government measure cites that measure's value and record id, not a world-metrics month.

**Files.** src/core2/modules/outcome-web.ts, src/core2/gov-measures.ts

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/coordination/gov.md), checked against main on Oct 16, 2026.
