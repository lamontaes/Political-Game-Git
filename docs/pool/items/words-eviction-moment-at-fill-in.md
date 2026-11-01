---
id: words-eviction-moment-at-fill-in
title: "A homeless household filled in when the player meets it never mentions its eviction (no director moment from its case)"
area: words
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after: core-evicted-counted-stays-counted
source: added with npm run pool -- add
---

**What.** Since evicted counted households stay counted (core-evicted-counted-stays-counted), a household evicted while counted holds its housing case and status row but no director moment labeled feeling:event:housing.eviction. When the player later meets one of its people and they are filled in, nothing they say brings up the eviction or where they are staying. The gap is registered as SG-WORDS-eviction-moment-at-fill-in, with its marker in src/director/conversation.ts.

**Rules.** Wire to the world: the person's own records (the eviction case's removedAt and its event id event:housing.eviction:<caseId>) give the moment at fill-in, so the director tells what happened to them. Ask why: the line cites the case record, not a typed reason.

**Done when.** In a played world (buildBenchWorld) in Storrs, Connecticut (key 0973980), a homeless counted household filled in when the player meets one of its people gets a feeling:event:housing.eviction moment dated from its case, by case and event record id; a test in src/director shows the person's conversation can bring it up; and the stopgap SG-WORDS-eviction-moment-at-fill-in is cleared.

**Files.** src/director/conversation.ts, src/director/ledger.ts, src/director/data/stopgaps.json

**Notes.** Lead: words. Filed by the speed lead, Nov 1, from the second review of speed/evicted-stay-counted.
