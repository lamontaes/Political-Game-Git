---
id: law-levels-unemployment-program-reversal
title: "Repeal and restore an existing unemployment insurance program by state bill"
area: laws
kind: bug
priority: 2
size: S
status: claimed
claimed-by: astra/unemployment-program-reversal
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-07T22:11:55.242Z
---

**What.** The starting-law audit finds no state bill for unemployment-insurance. Add the program control through the existing catalog and bill writer, retaining the existing program terms when its availability changes.

**Rules.** One law engine; level is data. Source 26 USC 3304(a)(19), which expressly reserves legislative amendment or repeal. No invented current program for AS, GU or MP. Existing filed claims keep their awarded terms; new claims read current law. Do not touch campaigns, electorate or views.

**Done when.** A generated world from an unchosen replay drafts an authorized state repeal and restoration; the normal bill enactment writer retains all program terms and the benefit reader stops and restores new-claim eligibility. Break-it check, ten fresh draws and new-game check. Explicitly report places without an existing program as requiring a separate establishment provision.

**Files.** scripts/research/build-bill-catalog.py,src/core2/data/legislature/bill-catalog.json,src/core2/data/legislature/series-powers.json,src/core2/modules/legislature.ts,src/core2/jobs-benefits.ts,src/core2/unemployment-program-reversal.test.ts

**Notes.** Astra child of draft #7330, bounded to repeal and restoration of an existing program. Two-hour unit; no helpers. Territorial program establishment remains a separate real gap, not an audit exclusion.
