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

**Gap list (sonnet-fd29, Nov 11, 2026): what a played governor is offered, read through the bench's own views.** Method: `buildBenchWorld` in three drawn places, the serving governor of the world made the player (`core.playerId`), 30 days run, then the views the screens call (`officeView`, `budgetView`, `ordersView`, `nominationsView`, `deskView`, `seatView`) read. Places and world seeds: Fair Play, South Carolina (4524730; 312d959c…a29c9d, governor term:seat:US-SC:governor:2025-01-20), Vaitogi, American Samoa (territory:AS:vaitogi; 4e173ab3…03eec, term:seat:US-AS:governor:2025-01-20), Washington, District of Columbia (1150000; 5dbf3d88…59671be1, its governor was Arkansas's, term:seat:US-AR:governor:2025-01-20). The governors in these worlds are official identities, not people filled in by Advanced, Play as, so this is a read of what the views return, not a played governor.

- **Budget priorities with staff advice.** `budgetView` returned the list of governments (the federal one first) with their executives; the governor's own state budget and any staff advice line were not looked at. Not confirmed.
- **Cabinet appointment.** `nominationsView` returned an empty list in all three worlds after 30 days; `officeView` returned `heads: []` and `jobs: []`. Nothing the governor can nominate or name was offered in the first month, so the power is not shown as offered here. (office-governor is marked done; either nominations start after a vacancy or later, or the view does not carry them: not determined.)
- **Sign or veto.** `deskView` returned an empty list and `ordersView` an empty list: no bill or order was waiting in 30 days, so sign-or-veto was not exercised. `seatView` returned `bodies: []`: a governor has no draft menu for a bill (the single-seat executive gap fixed in PR #8341's change, not yet on main when this was read).
- What the governor did get: `officeView` carries 5 to 6 recorded acts in the month (for example `legislative-leaders` attendance, `meet-department-head`), each with a record id such as `official:term:seat:US-SC:governor:2025-01-20:2025-02-17:legislative-leaders:session:US-SC:2025-01-14`.
- Not done: a governor made through Advanced, Play as; a run past the first legislative session; the budget-priority and sign-or-veto actions themselves; building the two build parts' Cause lines from this list (the list is too thin to).
