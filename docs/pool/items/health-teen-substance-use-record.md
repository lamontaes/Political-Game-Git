---
id: health-teen-substance-use-record
title: "Teens carry a substance-use record in the health engine, so legal cannabis sales reach a named teen"
area: people
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
lead: laws
blocked-on:
source: added with npm run pool -- add
---

**What.** Owner ruling Oct 29 13:30 UTC (OWNER-DECISIONS.md): build the missing record as a background simulation from research, never a step the player takes, inside the engine that owns it (no system beside it). The law matrix grades legalize-cannabis-sales partly wired because cannabis-sales-to-youth-use moves only the web's health.youth-cannabis-use number (SG-EW-HEALTH-condition-record). Build the record in the health engine beside its substance-use-disorder behavior condition: each full person aged 12 to 17 carries a past-month cannabis use record decided from their own traits (the same drug-use log-odds per trait level the adult condition reads) and household, calibrated to the national youth rate (NSDUH, fetched and quoted), and the web's factor for health.youth-cannabis-use multiplies that rate where the health engine decides it.

**Rules.** Simulate it, don't ask (owner, Oct 24 and Oct 29): background only, no player step. No dice: who uses follows their traits and records; the national rate checks the total. One model, two tiers: counted teens carry the same rate times their count. One rule, all 56 places: no state named in code.

**Done when.** In a drawn place from all 56 (place and seed named) with cannabis sales legal in one world and not its twin, a named teen's use record (or the rate it is decided at) is higher by the link's size, by record id, and docs/reports/law-wiring-matrix.json grades legalize-cannabis-sales wired. A test in src/core2 proves it on two seeds.

**Files.** src/core2/modules/health.ts; src/core2/data/health.json; data/research/outcome-web/links.json

**Notes.** TODO
