---
id: laws-checker-money-first-change-picks-drift
title: "The law checker's money cell names drift when a law pays or stops a payment months after it reaches someone"
area: laws
lead: laws
kind: bug
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: laws lead, Oct 26
claimed-at:
checked: fable 2026-11-10
---

**What.** The law checker's money cell names drift when a law pays or stops a payment months after it reaches someone. Among the payments that changed for those a law's records name, `ownPayments` picks the change nearest the day the law reached them, so a law that acts after a delay loses to drift. In the health and schools family's year runs the assistance work requirement stops SNAP only after a person's three months of benefit, so the cell named a move between a person's cash and their bank deposit instead: person_f1e981e7794173ed in Prescott, Michigan (seed a91c03e7d2b84f10), $9.26 apart on April 1, 2025 (`journal:2025-04-01:16450`), while the law's own stop was person_8ff861de2f15d13f on April 21, 2025 (`journal:2025-04-21:23538`). The grade is right; the evidence it names is not. The same drift picks a law that held no money: rent stabilization reaches leases in three drawn towns, every applied row records 0 saved, and the checker names rent transfers 4 to 13 minor units apart.

**Cause.** Found in code: `ownPayments` in scripts/law-wiring/own-payments.ts (line 133) picks the change nearest the reach day. A worker's analysis on main (Oct 27) found the `money.own` pairs are keyed by the posting's call site and the targets' rows carry no amount (`among: "reached"`), and `assistance-stopped` rows (src/core2/law-reach/group-b-money.ts, line 571, `appliedToReached(api, limit, stopped, "assistance-stopped")`) record no amount, so nothing in a pair tells the law's SNAP stop from drift.

**Fix.** Have the reach rows record the amount they stopped or paid and whether they track money (a recorded zero must be told from a row that tracks none), then match a pair to the row's amount, preferring a pair whose payment kind the law's engine posts (or whose id cites the law) over a nearer drift pair. A case with every reached row recording 0 and only drift-sized differences picks nothing, and rent stabilization's money stays partly with a why saying the cap held nothing below market.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the money a cell names is a payment the law's engine made or stopped, never a difference the two worlds drifted into. This is a check, not play: the player notices only that the game keeps running.

**Done when.** A second session, not the builder, reruns the assistance work requirement in a played world (`buildBenchWorld`) at the drawn place Prescott, Michigan (seed a91c03e7d2b84f10) and sees docs/reports/law-wiring-matrix.json name the SNAP stop (person_8ff861de2f15d13f, April 21, 2025) as its money. A rerun of rent stabilization at Prescott, Michigan, Uehling, Nebraska (seed 5e27b0c4196fd3a8) and North Pownal, Vermont (seed f72df05648f09350) picks no drift pair.

**Waits on.** Nothing.

**Files.** scripts/law-wiring/own-payments.ts, scripts/law-wiring/matrix.ts, src/core2/law-reach/group-b-money.ts, docs/reports/law-wiring-matrix.json

**Notes.** Laws lead, Oct 26, from PR #6026's run files. Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10): it makes the checker's money cell pick the right payment, a number only the matrix shows.

Analysis (Claude worker, Oct 27; released unbuilt). Reran `node --import tsx scripts/law-wiring/check.ts --seed a91c03e7d2b84f10 --days 140 --only us-policy-positions:health-human-services.work-requirement-for-assistance` on main (Prescott, Michigan): `money.own` pairs are keyed by the posting's call site (`accounts.transfer @ src/core2/life.ts:563`, `cost-of-living.ts:327`, ...), not a payment kind a law's engine names, and the targets' rows carry no amount (`among: "reached"`), so there is nothing in the pair to tell the law's SNAP stop from drift. In that run the SNAP stop for person_8ff861de2f15d13f is in the first pair (`life.ts:563`, 2025-04-21, 7,425 against 36,625, journal:2025-04-21:25005), the same site as the earlier February pairs for two other people, so the ranking would need a per-law list of the posting sites its engine owns, or the reach rows would have to record the amount they stopped or paid (`assistance-stopped` rows carry none). Either is a change to the records (lawApplied amounts for stopped benefits in src/core2/law-reach/group-b.ts) or to a new site registry, more than this item's two files; the item should be rewritten as the former, with the checker then matching a pair to the row's amount.

Carried from `laws-checker-own-payment-counts-drift` (laws-and-effects lead, Oct 28 00:45): the same drift picks a law that held no money. Rerun on main's checker, rent stabilization reaches 9 leases in Prescott, Michigan (a91c03e7d2b84f10), 20 in Uehling, Nebraska (5e27b0c4196fd3a8) and 14 in North Pownal, Vermont (f72df05648f09350), and every lawApplied row records 0 saved because the 7% cap never binds. ownPayments then looks among everyone reached and picks rent transfers that differ by 4 to 13 minor units (for example journal:2025-10-01:65390, -289353 against -289349). A recorded zero can't be told from a row that tracks no money, because LawAppliedRow.amountMinor is always present and a right such as refusing a union fee also writes 0. So the fix needs either the rows to say whether they track money, or a drift test on the pair itself: drift leaves both worlds paying nearly the same amount, while a law's own payment starts, stops or moves materially. Right-to-work in Prescott on main is graded on 89 minor units for one target, the nearest case already in the matrix. Added done-when line: a case with every reached row recording 0 and only drift-sized differences picks nothing, and rent stabilization's money stays partly with a why saying the cap held nothing below market.
