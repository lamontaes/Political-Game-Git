---
id: laws-checker-money-first-change-picks-drift
title: "The law checker's money cell names drift when a law pays or stops a payment months after it reaches someone"
area: laws
lead: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: laws lead, Oct 26
claimed-at:
---

**What.** `scripts/law-wiring/own-payments.ts` picks, among the payments that changed for those a law's records name, the change nearest the day the law reached them. A law that acts after a delay loses to drift. In the health and schools family's year runs (PR #6026), the assistance work requirement stops SNAP only after a person's three months of benefit, so the cell named a move between a person's cash and their bank deposit instead: person_f1e981e7794173ed in Prescott, Michigan (seed a91c03e7d2b84f10), $9.26 apart on April 1, 2025 (`journal:2025-04-01:16450`). The same run's list of changed payments holds the law's own: SNAP stopped for 4 of the 11 it reached, first person_8ff861de2f15d13f on April 21, 2025 ($366.25 in the control world, $74.25 with the law, `journal:2025-04-21:23538`). The grade is right; the evidence it names is not.

**Rules.** An effect is a read, not a record: the money a cell names is a payment the law's engine made or stopped, never a difference the two worlds drifted into.

**Done when.** The checker prefers a pair whose payment kind the law's engine posts (or whose id cites the law) over a nearer drift pair, and a rerun of the assistance work requirement in Prescott, Michigan (seed a91c03e7d2b84f10) in a played world (`buildBenchWorld`) names the SNAP stop in `docs/reports/law-wiring-matrix.json`. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** scripts/law-wiring/own-payments.ts, scripts/law-wiring/matrix.ts

**Notes.** Laws lead, Oct 26, from PR #6026's run files.
