---
id: opening-address-airing-uses-one-zone-per-state
title: "A state split across two time zones airs the address by one zone for the whole state (Tennessee, Texas, Florida and others)"
area: play
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
standard: 2
model: sonnet
effort: medium
root: none
lead: screens
source: found building the address airing for play-opening-lands-at-830-pm, Nov 14, 2026
---

**What.** The airing hour is read on the place's own clock from the state row in place-lookup.json, which holds one time zone per state, so a town on the other side of a state's zone line lands at the wrong hour by one. Seen: on the player card's clock on the opening day.

**Cause.** Found in code: `addressAiring` reads `corePlaceByJurisdictionId(...).context.initialMoment.timeZone`, built from the state's single `timeZone` in src/core2/data/places/place-lookup.json (STATE_CLOCKS for territories).

**Fix.** Give the place table a zone per county (SOURCED from the Census or IANA zone boundaries) and read it in the place lookup, so every clock in the game agrees, not only the airing.

**Time box.** 2 hours.

**Rules.** One rule, all 56 places. Every number lives in a parameter table tagged SOURCED, ESTIMATED or TUNABLE. No new stopgaps.

**Done when.** A second session starts lives in a Texas county in the Mountain zone (El Paso) and in a Central one, and the landing hour differs by one hour as the clock does, with place and seed named.

**Waits on.** Nothing.

**Files.** src/director/address-airing.ts, src/core2/data/opening/address-airing.json, src/bench/opening.ts
