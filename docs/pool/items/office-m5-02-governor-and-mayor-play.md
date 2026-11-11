---
id: office-m5-02-governor-and-mayor-play
title: "M5-02 Governor and mayor play"
area: office
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr: #5313
blocked-on: office-m5-02-governor-and-mayor-play-part-1-gap-list, office-m5-02-governor-and-mayor-play-part-2-priorities-move-spending, office-m5-02-governor-and-mayor-play-part-3-cabinet-and-veto
milestone: M5
source: "docs/roadmap/later-specs-draft.md M5-02"
claimed-at:
after:
standard: 2
model: sonnet
effort: medium
root: none
lead: governing
checked: fable 2026-11-10
---

**What.** Set budget priorities with staff advice, appoint a cabinet, sign or veto, and live with the results, for a played governor or mayor. The umbrella was written Oct 12. Its children office-governor and the three office-budget-season items are done, so what remains (governor priorities moving spending, cabinet, veto) has to be listed before anything is built. Line-by-line budgets are optional depth.

**Cause.** Needs cause. Looked at: office-governor, office-budget-season-mayor-act, -bench-editor and -payment-chain are done; the spec (docs/roadmap/later-specs-draft.md, M5-02) says to verify how much is built. Nobody has listed the remaining gap.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Spec approved by the owner Oct 12. One engine per mechanic: governors and mayors use the one budget and executive engines. The chain is the acceptance. AGENTS.md rules.

**Done when.** A second session plays a governor in a drawn state (state and seed named) and sees the governor's priorities change real spending and outcomes: a budget line, a later payment, and the person it reached, by record id. Part 1's list shows what already works.

**Waits on.** Its three parts: part 1 (gap-list) lists the gap, parts 2 and 3 build it: office-m5-02-governor-and-mayor-play-part-1-gap-list, office-m5-02-governor-and-mayor-play-part-2-priorities-move-spending and office-m5-02-governor-and-mayor-play-part-3-cabinet-and-veto.

**Files.** docs/roadmap/later-specs-draft.md, src/core2/office-day-state.ts, src/core2/modules/executive.ts

**Notes.** Priority 3 until scheduled. Verify how much is built before starting.
