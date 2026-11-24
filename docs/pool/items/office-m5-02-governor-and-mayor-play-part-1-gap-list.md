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
