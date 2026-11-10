---
id: web-fare-free-riders-reach-nothing
title: "The riders a fare-free law adds reach someone's records, or the link says why not"
area: core
kind: wiring
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: effects
model: sonnet
effort: low
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** fare-free-transit-to-ridership grades as reaching in the effect matrix: the price engine reads the web's ridership factor when it settles each household's transit fares (src/core2/modules/place-prices.ts, the transit-fare price rule). But under the fare-free law the fare is zero, so the factor multiplies a zero fare, and no other engine reads transit.ridership. The 42 percent more riders the research finds move no money and change no record. Decide what reads them (for example the vehicle-miles a household no longer drives, which the price engine already prices) or mark the link with its specific reason and stopgap so the matrix stops counting it as reaching.

**Cause.** Found in code: src/core2/modules/place-prices.ts prices the transit fare (rule 'transit-fare', about line 104) by the web's ridership factor; under a fare-free law the fare is 0, so the 42% added riders move no money and no other engine reads transit.ridership, while scripts/outcome-web/effect-matrix.ts grades fare-free-transit-to-ridership as reaching.

**Fix.** Prefer marking fare-free-transit-to-ridership as not reaching, with a specific stopgap row and a test holding the reason, unless the vehicle-miles a rider no longer drives is already priced by the price engine, in which case read it there.

**Time box.** 2 hours for one Sonnet session.

**Rules.** An effect is a read, not a record. Research before building: any new reader's size comes from a fetched source. This is a game, not a spreadsheet: add a reader only if the golden path or the owner needs it; otherwise give the link its reason.

**Done when.** A second session either sees in a played world (place and seed named) a record move because of the added riders under a fare-free law, by record id, or sees the link listed as not reaching in the effect matrix with a specific stopgap row and a test that holds the reason.

**Waits on.** Nothing.

**Files.** src/core2/modules/place-prices.ts, scripts/outcome-web/effect-matrix.ts

**Notes.** Filed Oct 25 by the effects lead from web-reach-places-services.
