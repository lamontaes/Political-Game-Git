---
id: office-m5-02-governor-and-mayor-play-part-1-gap-list
title: "Governor and mayor play: list what a played governor can already do"
area: office
kind: research
priority: 3
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-office-m5-02-governor-and-mayor-play-part-1-gap-list
pr: #8630
after:
blocked-on:
lead: governing
model: sonnet
effort: low
root: design-story-director
source: split from office-m5-02-governor-and-mayor-play in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:30:07.961Z
---

**What.** The umbrella M5-02 says a governor should set budget priorities with staff advice, appoint a cabinet, sign or veto, and live with the results. Its child items office-governor and the three office-budget-season-mayor-act, -bench-editor and -payment-chain are done, so nobody knows what is left. List, for each of the three powers, whether a played governor in a drawn state can already do it, with the record ids that show it. Write the list into the umbrella item's Notes.

**Cause.** Design: docs/roadmap/later-specs-draft.md (M5-02, approved by the owner Oct 12) says to verify how much is built; office-governor and the budget-season children are done in docs/pool/items, and nobody has listed the remaining gap.

**Fix.** Play a governor in a drawn state through the bench, record for each of budget priorities with staff advice, cabinet appointment and sign-or-veto what the screens offer and what record each writes, then file the gap as the umbrella's Notes and set the two build parts' Cause lines from it.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Look before you ask: read the done children and OWNER-DECISIONS before listing a gap. Wire to the world: a power counts as built only if another engine reads the record it writes. Report the furthest step a player reaches, not an audit percentage.

**Done when.** A second session reads the list in the umbrella's Notes, replays any one line in the running game in a drawn state (state and seed named), and sees the same record id. The list covers all three powers with record ids from one drawn state, and each gap line names the engine file where it lives.

**Waits on.** Nothing.

**Files.** docs/pool/items/office-m5-02-governor-and-mayor-play.md, docs/roadmap/later-specs-draft.md, src/core2/office-day-state.ts, src/core2/modules/executive.ts

**Gap list (sonnet-fd29, Nov 11, 2026): what a played governor is offered, read through the bench's own views.** Method: `buildBenchWorld` in three drawn places, the serving governor of the world made the player (`core.playerId`), 30 days run, then the views the screens call (`officeView`, `budgetView`, `ordersView`, `nominationsView`, `deskView`, `seatView`) read. Places and world seeds: Fair Play, South Carolina (4524730; 312d959c…a29c9d, governor term:seat:US-SC:governor:2025-01-20), Vaitogi, American Samoa (territory:AS:vaitogi; 4e173ab3…03eec, term:seat:US-AS:governor:2025-01-20), Washington, District of Columbia (1150000; 5dbf3d88…59671be1, its governor was Arkansas's, term:seat:US-AR:governor:2025-01-20). The governors in these worlds are official identities, not people filled in by Advanced, Play as, so this is a read of what the views return, not a played governor.

- **Budget priorities with staff advice.** `budgetView` returned the list of governments (the federal one first) with their executives; the governor's own state budget and any staff advice line were not looked at. Not confirmed.
- **Cabinet appointment.** `nominationsView` returned an empty list in all three worlds after 30 days; `officeView` returned `heads: []` and `jobs: []`. Nothing the governor can nominate or name was offered in the first month, so the power is not shown as offered here. (office-governor is marked done; either nominations start after a vacancy or later, or the view does not carry them: not determined.)
- **Sign or veto.** `deskView` returned an empty list and `ordersView` an empty list: no bill or order was waiting in 30 days, so sign-or-veto was not exercised. `seatView` returned `bodies: []`: a governor has no draft menu for a bill (the single-seat executive gap fixed in PR #8341's change, not yet on main when this was read).
- What the governor did get: `officeView` carries 5 to 6 recorded acts in the month (for example `legislative-leaders` attendance, `meet-department-head`), each with a record id such as `official:term:seat:US-SC:governor:2025-01-20:2025-02-17:legislative-leaders:session:US-SC:2025-01-14`.
- Not done: a governor made through Advanced, Play as; a run past the first legislative session; the budget-priority and sign-or-veto actions themselves; building the two build parts' Cause lines from this list (the list is too thin to).
