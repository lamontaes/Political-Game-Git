---
id: team2-a53-opening-owner-records
impact: patch
section: Fixed
title: Opening mortgage estimates distinguish recorded and estimated home tenure
---

Opening homes already recorded as mortgaged now get loan terms and payments
through the existing household-loan writer. The principal uses the home's game
valuation and sourced down-payment share; the rate uses the saved policy rate
plus the cited mortgage spread. Recorded residence months, or an explicitly
labeled same-town game average, determine the remaining amortized balance and
term. An initialized peer average is labeled separately from observed tenure.

Home purchases and ordinary life refreshes use the same monthly loan service.
Existing mortgage IDs and payments remain intact when old saves have no loan
terms. A contract with unrecorded escalation thresholds records missed payments
without inventing a default or collections deadline. Opening mortgages explicitly
use the approved simplified fee-free contract.
