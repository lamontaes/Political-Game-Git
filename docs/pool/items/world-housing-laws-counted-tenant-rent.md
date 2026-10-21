---
id: world-housing-laws-counted-tenant-rent
title: "housing-laws test: a counted tenant's rent after fill-in is 91,375 where the cap leaves 97,771 (La Liga, Puerto Rico)"
area: world
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/housing-laws-tiers-test-s5
pr: #4921
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T13:35:42.349Z
---

**What.** `src/core2/housing-laws.test.ts` ("caps both tiers at renewal and preserves a counted tenant's rent when filled in") failed once in La Liga, Puerto Rico: after the counted tenant was filled in, its lease read 91,375 where the cap leaves 97,771. In 13 draws at that place (seeds a1 to a3 and b1 to b10) and 30 draws elsewhere the test never reached that case: it skipped itself ("no renewed tenants in both tiers") because no renewal row existed two days after the law took effect. The test now records each tenant's baseline renewal first and draws places until one has a renewed tenant in both tiers, and fails by name if none does; with that it passes in three random draws. The La Liga failure itself did not reproduce.

**Rules.** The lease a counted tenant is filled in with is the rent the household was paying, capped by the law in force. No dice. One rule, all 56 places.

**Done when.** In a drawn place and a seed the builder did not choose (name both), a counted tenant renewed under a rent cap and then filled in keeps the capped rent on its lease, and `src/core2/housing-laws.test.ts` passes without skipping.

**Files.** src/core2/housing-laws.test.ts, src/core2/modules/residents.ts

**Notes.** If the 91,375 case recurs in the now non-vacuous test, the cause is in `householdContracts` (`src/core2/modules/residents.ts`, about line 1416), which builds the lease from `flow.amountMinor`: check that the renewal wrote the capped rent to the flow before the fill-in. Found by the sharded test sweep and an earlier session, Oct 17.
