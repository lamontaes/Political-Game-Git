---
id: office-m5-02-governor-and-mayor-play-part-2-priorities-move-spending
title: "A governor's changed budget priority moves a budget line and a later payment"
area: office
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: office-m5-02-governor-and-mayor-play-part-1-gap-list
blocked-on:
lead: governing
model: sonnet
effort: medium
root: design-story-director
source: split from office-m5-02-governor-and-mayor-play in the pool redo, Nov 10, 2026
---

**What.** In a drawn state a played governor sets budget priorities with staff advice, and a changed priority moves a budget line and a later payment. Live with the results: the line change shows in the next payment a department or person receives. The gap list in part 1 says how much of this exists; build only what it lists as missing.

**Cause.** Design: docs/roadmap/later-specs-draft.md (M5-02, approved by the owner Oct 12). The remaining gap is not yet listed; part 1 lists it.

**Fix.** After part 1, wire the governor's priority choice into the budget engine's line the same way the mayor's budget route does, so one changed priority is followed to a budget line and a later payment.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: a dollar is followed from the priority to a named person's payment. An effect is a read, not a record: the budget engine reads the priority when it sets the line. One engine per mechanic: reuse the one budget engine and the office-budget-season route, no governor-only budget path. No dice.

**Done when.** A second session plays a governor in a drawn state (state and seed named), changes one budget priority, and sees the budget line move and a later payment change, by line and payment record ids, in the running game. The change shows in the state day and the journal without a form.

**Waits on.** office-m5-02-governor-and-mayor-play-part-1-gap-list.

**Files.** src/core2/office-day-state.ts, src/core2/modules/executive.ts, src/core2/modules/budgets.ts
