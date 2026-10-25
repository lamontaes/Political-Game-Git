---
id: web-fare-free-riders-reach-nothing
title: "The riders a fare-free law adds reach someone's records, or the link says why not"
area: core
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** fare-free-transit-to-ridership grades as reaching in the effect matrix: the price engine reads the web's ridership factor when it settles each household's transit fares (src/core2/modules/place-prices.ts, the transit-fare price rule). But under the fare-free law the fare is zero, so the factor multiplies a zero fare, and no other engine reads transit.ridership. The 42 percent more riders the research finds move no money and change no record. Decide what reads them (for example the vehicle-miles a household no longer drives, which the price engine already prices) or mark the link with its specific reason and stopgap so the matrix stops counting it as reaching.

**Rules.** An effect is a read, not a record. Research before building: any new reader's size comes from a fetched source. This is a game, not a spreadsheet: add a reader only if the golden path or the owner needs it; otherwise give the link its reason.

**Done when.** Either a played world (seed named) shows a record moving because of the added riders under a fare-free law, by record id, or the link is listed as not reaching with a specific stopgap row and a test holds the reason.

**Files.** src/core2/modules/place-prices.ts, scripts/outcome-web/effect-matrix.ts

**Notes.** Filed Oct 25 by the effects lead from web-reach-places-services.
