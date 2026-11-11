---
id: web-fare-free-riders-reach-nothing
title: "The riders a fare-free law adds reach someone's records, or the link says why not"
area: core
kind: wiring
priority: 3
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-web-fare-free-riders-reach-nothing
pr: #8716
after:
blocked-on:
lead: effects
model: sonnet
effort: low
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T06:34:47.182Z
branch: claude/pool-web-fare-free-riders-reach-nothing
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

Released (2026-11-11): Cause is narrower than the Fix assumes: the ridership factor place-prices.ts reads (transit.ridership, the transit-fare price rule and the web-only rule) is moved by other links too (transit-service-to-ridership) and prices a positive fare with no fare-free law, so deleting the read would break those; the effect matrix grades a link by whether an engine reads its outcome (reachPoint, engineReaders(link.to)), so no stopgap row naming the link changes its grade and the only per-link override, a links.json status, would state something false. Needs a design call from the laws lead (a link-level reach override with a reason, or a vehicle-miles reader) before a build. Continue on branch claude/pool-web-fare-free-riders-reach-nothing.

Released (2026-11-11): Looked for where a link is marked not reaching: src/core2/data/outcome-web/coverage.json is generated (scripts/outcome-web/write-coverage.ts, coverageTable() in src/core2/outcome-web-model.ts) and lists fare-free-transit-to-ridership under 'wired' because place-prices.ts reads the ridership factor in its transit-fare rule; 'waiting' rows are derived from missing engine measures (waitingOn), not set by hand, and the 'reaches' grade is in scripts/outcome-web/effect-matrix.ts / docs/reports/effect-web-matrix. Marking it not reaching needs a change to that derivation or the matrix's grade rule plus a stopgap row and test; I did not find a hand-set field. The owner of the effect matrix should say where a known-not-reaching link is recorded. Continue on branch claude/pool-web-fare-free-riders-reach-nothing.
