---
id: laws-checker-own-payment-counts-drift
title: "The law checker's own-payment path grades a law's money wired on a few cents of twin-world drift where the law held nothing"
lead: laws-effects
area: laws
kind: bug
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Rerun on main's checker (scripts/law-wiring/check.ts, 365 days), rent stabilization reaches 9 leases in Prescott, Michigan (seed a91c03e7d2b84f10), 20 in Uehling, Nebraska (5e27b0c4196fd3a8) and 14 in North Pownal, Vermont (f72df05648f09350). Every lawApplied record names 0 saved, because the 7% cap never binds while market rents follow regional pay. Yet ownPayments in scripts/law-wiring/own-payments.ts picks cost-of-living.ts:327 transfers that differ by 4 to 13 minor units on 4 of 9 and 5 of 20 targets (for example journal:2025-10-01:65390, -289353 against -289349), and matrix.ts would grade the money link wired from that pick. The 92-day window is counted from the day the law reached each target, which for a lease renewal is months after the enactment, so the twin worlds have already drifted by then. Main's matrix is not wrong today only because rent stabilization's committed run entries predate the own-payment path; the nearest graded case on main is right-to-work in Prescott, picked on 89 minor units for one target.

**Rules.** Ask why: a payment is the law's only where the run shows the law caused it, never a difference the two worlds' drift explains. An effect is a read, not a record: a law that held no one's money has no money link, however many records it wrote. Never say wired without the row.

**Done when.** In scripts/law-wiring/own-payments.test.ts a test case with the rent-stabilization shape (every reached record's amount 0, drift-sized differences after the reach) picks nothing and a case with a real payment still picks it; rerun into the three housing towns above, rent stabilization's money stays partly with a why that says the cap held nothing below market, and regenerating the matrix changes no other row's money grade, or the PR body names each row that moves and why.

**Files.** scripts/law-wiring/own-payments.ts, scripts/law-wiring/own-payments.test.ts, scripts/law-wiring/matrix.ts

**Notes.** Found Oct 27 by the laws-and-effects lead while rerunning rent stabilization; the reruns are not committed.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): twin of `laws-checker-money-first-change-picks-drift`; close into it and carry any line it lacks there.
