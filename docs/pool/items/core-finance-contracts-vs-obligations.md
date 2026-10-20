---
id: core-finance-contracts-vs-obligations
title: "Standing payments live in two layers, finance contracts and accounts obligations: pick one"
area: core
kind: cleanup
priority: 2
size: M
status: claimed
claimed-by: claude/n4-core-finance-contracts-vs-obligations
pr:
blocked-on:
source: found by the world-accounts-api proof (Oct 19)
claimed-at: 2026-10-20T15:47:52.069Z
---

**What.** Housing leases, bills and tuition run as `finance.contracts` rows with `arrearsMinor` (src/core2/finance-state.ts), while retirement claims and group B law reach use `accounts.addObligation` with its own arrears (src/core2/accounts.ts). The two do the same job with two sets of rules for due dates, partial payment and arrears. Replace one with the other so a standing payment has one layer, one arrears record and one place the engines read; the old layer's code, rows and tests are deleted in the same change.

**Rules.** Replace, never layer: the layer that loses is deleted, not kept beside the winner. Wire to the world: every household's rent and bill still posts the same dollars on the journal, shown in a played year. Speed: a year must stay within 20 percent of its base, measured on the same machine.

**Done when.** A one-year run of the played world (`buildBenchWorld`, a drawn place from all 56, a seed the builder did not choose) shows rent, a bill and a retirement claim each posted from the one layer by journal record id, a missed rent accruing arrears that housing reads when it files an eviction, the old layer gone from src/core2, and `npm run speed:year` within 20 percent of base.

**Files.** src/core2/finance-state.ts, src/core2/accounts.ts, src/core2/modules/housing.ts, src/core2/housing-occupancy.ts

**Notes.** Found while proving world-accounts-api (PR #5176): rent is already a standing contract with arrears, so the world engines are not bypassing the accounts API. Core area: ask on its PR.
