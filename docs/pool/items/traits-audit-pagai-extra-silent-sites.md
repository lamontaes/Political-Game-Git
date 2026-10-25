---
id: traits-audit-pagai-extra-silent-sites
title: "Explain four additional silent trait sites found in a territory election year"
area: people
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after: traits-decisions-never-run
source: Merger 2 independent audit of PR #5886, October 25
---

**What.** A fresh election-window trait audit in Pagai, American Samoa found four zero-call sites with no gap row: parties.join, meetings.take-part, meetings.hold-town-hall and campaigns.party-firmness. They are outside the older never-run target list handled by the current audit PR. Trace the actual guards and place records for these calls and report whether each is legitimately absent in that year or needs a bounded engine fix.

**Rules.** One rule, all 56 places: read the territory and venue records and shared guards instead of naming a place in engine logic. Wire to the world: each explanation cites the actual producer, file and line, or a decision record from a generated year. No dice: do not manufacture random triggers to make the audit count nonzero.

**Done when.** The trait audit on buildBenchWorld reproduces seed 2351539a9f00bfa5 in territory:AS:pagai for 2025-12-03 through 2026-12-03, and a fresh drawn-place case is checked beside it. Each of the four sites has an actual decision or owning result record id, or a gap row giving the exact file and line, the place records that prevent it in that year, and any bounded work needed; the PR body distinguishes measured causes from inference.

**Files.** scripts/traits/trait-wiring-audit.ts, scripts/traits/trait-wiring-matrix.ts, data/content/trait-decision-gaps.json, src/core2/modules/parties.ts, src/core2/modules/meetings.ts, src/core2/modules/campaigns.ts

**Notes.** Merger 2 local gate of #5886: Pagai root2351539a9f00bfa5, played/flat/mirror years passed; final matrix60/86 ran and no unnamed formula sites after current jobs aliases. These four rows have gap:null. No engine defect or territory-wide design restriction has yet been inferred from their zero counts.
