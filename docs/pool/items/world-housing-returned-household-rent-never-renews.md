---
id: world-housing-returned-household-rent-never-renews
title: "A household returned to the counts keeps its record in the core, so its rent never renews or meets a rent cap"
area: world
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/housing-laws-demoted-rent
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T10:05:23.468Z
---

**What.** A counted household that was filled in and then returned to the counts keeps its household record in the core while its lease ends and its rent is a flow again. The renewal pass skipped any counted household that still had a core record, so a returned household's rent was never renewed, never raised with the market and never held by a rent stabilization law. Found by housing-laws.test.ts in Acushnet Center, Massachusetts (seed 4d483715b7e58e812cf2c8ba39e1e5906d5736df9877b91d3557798b7e134e13), where household_a77f6c7c668adaf9 paid 80227 against a capped 85843.

**Rules.** One model, two tiers: a returned counted household renews and is capped by the same rule as any counted tenant. An effect is a read: the rent stabilization law must be read for its flow. Replace, never layer: the lookup that assumed one lease id per household is replaced, not wrapped.

**Done when.** In the played world (buildBenchWorld, Acushnet Center seed 4d483715b7e58e812cf2c8ba39e1e5906d5736df9877b91d3557798b7e134e13 and a fresh drawn place) a returned counted household's rent flow is renewed and capped at renewal, named by flow id, and src/core2/housing-laws.test.ts edge case passes with the household's live lease found by household, not by a single lease id.

**Files.** src/core2/housing-occupancy.ts, src/core2/housing-laws.test.ts

**Notes.** TODO
