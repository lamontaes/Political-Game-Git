---
id: research-bribe-cheated-share-calibration
title: "Research: how many taken bribes go bad, to check the corruption chain's tell and tip rate against"
area: gov
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10 2026 (docs/stopgaps/triage-2026-11-10/p15.md)
lead: researcher
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** A taken bribe leads to a telling and a press tip only when the two parties fall out, which needs the bought firm to be cheated (an award that went to another firm, a bill voted the other way). Officials keep a median-or-better cushion, so a town takes a handful of bribes a year and almost none go bad. Find the real share of bribes that go bad (cheated, exposed by a party or a tip) so the proof reports the town's tell and tip counts beside it. Closes SG-P15-bribe-falling-out-rare as a marked estimate.

**Cause.** Found in code: `src/core2/modules/corruption.ts` line 634 (`onRelationshipChange`, marked `stopgapId: SG-P15-bribe-falling-out-rare`) weighs `corruption.tell` and `press.tip` only when a tie sours; the audited years showed the bought firm winning every award.

**Fix.** Read the public-corruption case counts by office (DOJ Public Integrity Section reports, `data/research/corruption/doj-pin-2023-local-state-prosecutions.json`) and bribery-exposure studies (how bribes come to light: tips from a party, audits, press), fetch and quote the pages, and write `data/research/corruption/bribe-exposure-shares.json` (new) with the shares by how a case surfaced. Have `scripts/research/core-parameters-year.ts` print the town's taken bribes, tells and tips per year beside them. If no share converts, say so and keep the row as a marked estimate.

**Time box.** 4 hours for a Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: real counts check totals and never pick one actor's outcome. No dice: nothing here forces a breach; a letdown still comes from the contract engine's own losers. Estimate, never UNKNOWN.

**Done when.** A second session, in a one-year `buildBenchWorld` across three drawn places (places and seeds named in the PR), sees `scripts/research/core-parameters-year.ts` print each town's taken bribes, tells and press tips beside the sourced exposure shares, and sees the row's replacement text name the file that holds them.

**Waits on.** Nothing.

**Files.** src/core2/modules/corruption.ts, scripts/research/core-parameters-year.ts, data/research/corruption/doj-pin-2023-local-state-prosecutions.json, data/research/corruption/bribe-exposure-shares.json (new), src/core2/data/stopgaps/p15.json
