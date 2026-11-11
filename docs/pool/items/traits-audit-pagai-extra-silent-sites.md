---
id: traits-audit-pagai-extra-silent-sites
title: "Explain four additional silent trait sites found in a territory election year"
area: people
kind: wiring
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
blocked-on:
after: traits-decisions-never-run
lead: traits
model: sonnet
effort: medium
root: none
source: Merger 2 independent audit of PR #5886, October 25
checked: fable 2026-11-10
---

**What.** A fresh election-window trait audit in Pagai, American Samoa found four zero-call sites with no gap row: parties.join, meetings.take-part, meetings.hold-town-hall and campaigns.party-firmness. They are outside the older never-run target list handled by the current audit PR. Trace the actual guards and place records for these calls and report whether each is legitimately absent in that year or needs a bounded engine fix.

**Cause.** Measured: TRAIT_AUDIT_ELECTION=1 trait audit (scripts/traits/trait-wiring-audit.ts) on buildBenchWorld with seed 2351539a9f00bfa5, territory:AS:pagai, 2025-12-03 to 2026-12-03: parties.join, meetings.take-part, meetings.hold-town-hall and campaigns.party-firmness show zero calls and no row in data/content/trait-decision-gaps.json (item Notes, #5886).

**Fix.** For each of the four, read the guard in its module (src/core2/modules/parties.ts, meetings.ts, campaigns.ts and src/core2/campaign-stances.ts) and the territory's place records, then write a gap row naming file, line and the record that prevents the call, or file a bounded engine fix as its own item. Do not add random triggers.

**Time box.** 3 hours for one Sonnet session.

**Rules.** One rule, all 56 places: read the territory and venue records and shared guards instead of naming a place in engine logic. Wire to the world: each explanation cites the actual producer, file and line, or a decision record from a generated year. No dice: do not manufacture random triggers to make the audit count nonzero.

**Done when.** A second session reruns the trait audit on buildBenchWorld for root 2351539a9f00bfa5 in territory:AS:pagai (2025-12-03 to 2026-12-03) and on one drawn place it chose (named with its seed); each of the four sites then has either an actual decision or owning result record id, or a gap row in data/content/trait-decision-gaps.json giving the exact file and line, the place records that prevent it, and any bounded work needed, with measured causes kept apart from inference.

**Waits on.** Nothing.

**Files.** scripts/traits/trait-wiring-audit.ts, scripts/traits/trait-wiring-matrix.ts, data/content/trait-decision-gaps.json, src/core2/modules/parties.ts, src/core2/modules/meetings.ts, src/core2/modules/campaigns.ts, src/core2/campaign-stances.ts

**Notes.** Merger 2 local gate of #5886: Pagai root2351539a9f00bfa5, played/flat/mirror years passed; final matrix60/86 ran and no unnamed formula sites after current jobs aliases. These four rows have gap:null. No engine defect or territory-wide design restriction has yet been inferred from their zero counts.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have explained four silent trait sites in one territory's election year; an audit report, no player sees it.
