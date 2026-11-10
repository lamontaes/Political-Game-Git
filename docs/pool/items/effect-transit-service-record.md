---
id: effect-transit-service-record
title: "A place keeps its transit service, so shifting highway money to transit changes what riders get"
area: laws
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage of the effect register, Nov 10, 2026
lead: laws-effects
standard: 2
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** The link highway-money-for-transit-to-service moves transit service (vehicle revenue miles per resident), but the share is kept only in the outcome web, so the law shifting highway funds to transit changes nothing a rider meets. Give each place a transit service record that the budget and the web both write and that the trip count in place-prices reads, so the money moved in a bill reaches the trips households take.

**Cause.** Found in code: src/core2/modules/prices-web-gaps.ts line 12 registers SG-EFFECT-WEB-prices-transit-service; no module keeps a transit agency or service row, and src/core2/modules/place-prices.ts reads transit trips only from the fare-free rule (line 104 onward), never from service.

**Fix.** Add one transit service row per place in src/core2/modules/place-prices.ts, seeded from the National Transit Database's vehicle revenue miles per resident (a place with no transit gets zero, from data, never a place name in code). Make the budget line for transit set it from the line's level against its base, the way setRoadCondition and poorRoadShareAt do for roads. Let the web factor for transit-service-to-ridership multiply the trips a household takes. Resolve SG-EFFECT-WEB-prices-transit-service in src/core2/data/stopgaps/effect.json with the PR number. Rail ridership (SG-EFFECT-WEB-prices-rail-ridership) is another session's stand-in; read this row, do not duplicate it.

**Time box.** 6 hours for a Sonnet session.

**Rules.** One engine per mechanic: extend place-prices, no second transit engine. No dice: service follows the budget and the web's size. One rule, all 56 places: the base comes from data. An effect is a read: the trip count must read the service row.

**Done when.** A second session runs a one-year played world in a drawn place and a seed the builder did not choose (both named in the PR body), enacts the law shifting highway funds to transit, and sees the place's service row rise and the households' monthly transit trips rise after the link's lag, by record id; speed:year is no more than 20% slower than its base.

**Waits on.** Nothing.

**Files.** src/core2/modules/place-prices.ts, src/core2/modules/prices-web-gaps.ts, src/core2/law-reach/group-b.ts, src/core2/data/stopgaps/effect.json
