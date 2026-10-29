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

**Time box.** 3 hours, Sonnet, no helpers; builds against nothing.

**Files.** scripts/law-wiring/own-payments.ts, scripts/law-wiring/matrix.ts

**Notes.** Laws lead, Oct 26, from PR #6026's run files.

Analysis (Claude worker, Oct 27; released unbuilt). Reran `node --import tsx scripts/law-wiring/check.ts --seed a91c03e7d2b84f10 --days 140 --only us-policy-positions:health-human-services.work-requirement-for-assistance` on main (Prescott, Michigan): `money.own` pairs are keyed by the posting's call site (`accounts.transfer @ src/core2/life.ts:563`, `cost-of-living.ts:327`, ...), not a payment kind a law's engine names, and the targets' rows carry no amount (`among: "reached"`), so there is nothing in the pair to tell the law's SNAP stop from drift. In that run the SNAP stop for person_8ff861de2f15d13f is in the first pair (`life.ts:563`, 2025-04-21, 7,425 against 36,625, journal:2025-04-21:25005), the same site as the earlier February pairs for two other people, so the ranking would need a per-law list of the posting sites its engine owns, or the reach rows would have to record the amount they stopped or paid (`assistance-stopped` rows carry none). Either is a change to the records (lawApplied amounts for stopped benefits in src/core2/law-reach/group-b.ts) or to a new site registry, more than this item's two files; the item should be rewritten as the former, with the checker then matching a pair to the row's amount.

Carried from `laws-checker-own-payment-counts-drift` (laws-and-effects lead, Oct 28 00:45): the same drift picks a law that held no money. Rerun on main's checker, rent stabilization reaches 9 leases in Prescott, Michigan (a91c03e7d2b84f10), 20 in Uehling, Nebraska (5e27b0c4196fd3a8) and 14 in North Pownal, Vermont (f72df05648f09350), and every lawApplied row records 0 saved because the 7% cap never binds. ownPayments then looks among everyone reached and picks rent transfers that differ by 4 to 13 minor units (for example journal:2025-10-01:65390, -289353 against -289349). A recorded zero can't be told from a row that tracks no money, because LawAppliedRow.amountMinor is always present and a right such as refusing a union fee also writes 0. So the fix needs either the rows to say whether they track money, or a drift test on the pair itself: drift leaves both worlds paying nearly the same amount, while a law's own payment starts, stops or moves materially. Right-to-work in Prescott on main is graded on 89 minor units for one target, the nearest case already in the matrix. Added done-when line: a case with every reached row recording 0 and only drift-sized differences picks nothing, and rent stabilization's money stays partly with a why saying the cap held nothing below market.
