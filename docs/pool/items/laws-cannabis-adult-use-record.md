---
id: laws-cannabis-adult-use-record
title: "Named adults 21 and over carry a cannabis adult-use record that the cannabis spending reads"
area: people
kind: wiring
priority: 3
size: M
status: in-pr
claimed-by: claude/political-game-pool-b6g0dl
pr: #5292
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:29:18.783Z
---

**What.** Legal cannabis spending is a per-resident average (pricesCannabisSpendPerResidentMinor in place-prices.ts) because no person carries a use record. Seed an adult-use record on named adults 21 and over at generation, with prevalence by state from sourced survey data, and have the place-prices cannabis spending read it so a named adult's spending follows their own record and counted groups carry the same share times their count. A player would notice that who buys cannabis in town is some neighbors and not all.

**Rules.** One model, two tiers: a counted group reads the same prevalence as a full person, times its count. No dice: the record comes from seeded generation of who exists, and the spending from the record, the law in force and pay. Estimate, never UNKNOWN: prevalence starts from the real state average with a per-world spread and its source. One rule, all 56 places: prevalence is state data.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56 where the sales law is in force, seed named) the cannabis spending of each named adult is read from their use record by record id, an adult without a record spends nothing on cannabis, and a test in src/core2/cannabis-sales-law.test.ts shows the town total still matching the sourced per-resident figure within its spread.

**Files.** src/core2/modules/place-prices.ts, src/core2/cannabis-sales-law.test.ts, src/core2/data/prices/parameters.json

**Notes.** Part of laws-cannabis-dispensaries-adult-use (SG-GOV-REACH-A-cannabis-market, the PEOPLE half). Needs a sourced prevalence by state (NSDUH past-year adult use).
