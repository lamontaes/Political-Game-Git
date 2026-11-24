---
id: nation-president-orders-by-series-part-3-played-president-orders
title: "A played President can see and issue the orders the unplayed one weighs"
area: gov
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: nation-president-orders-by-series-part-1-more-series-authorities
blocked-on:
lead: nation
model: opus
effort: medium
root: rc7-player-cannot-drive
source: split from nation-president-orders-by-series in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** The played President has no screen over federal orders (stopgap SG-NATION-federal-axis-proxy); `presidentialOrders` in src/core2/office-day-federal-president.ts lists the orderable set but nothing lets the player choose one. Let the played President issue an order through the same `issueFederalOrder` path the unplayed one uses. src/bench is the play-first lane's, so the screen half goes to the lane with a Needs from others line. This is part 3 of nation-president-orders-by-series. Seen: the played President's screen of orders to issue (playing as president is an owner goal, Oct 10).

**Cause.** Found in code: `presidentialOrders` (line 974) in src/core2/office-day-federal-president.ts returns the orderable set but the played President's Your office has no control over it.

**Fix.** Expose the orderable set and each order's authority and the President's view through the office-day state, issue through `issueFederalOrder`, and add the control to the Your office screen in src/bench. The play-first lane owns src/bench: follow docs/play-first/LAW.md, the screen-to-mock skill and the shared controls, and ask for the Words session's review of any new label.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One executive engine: the played and unplayed President issue through the same path. No hand-written player text: the screen shows record data and worded labels. Replace, never layer: the stopgap is narrowed in the same change.

**Done when.** A second session, not the builder, plays a seated President in a drawn place (place and seed named), opens the orders on Your office, issues one, and sees a law row for the series in force from the next day citing the order and the player, by record id.

**Waits on.** nation-president-orders-by-series-part-1-more-series-authorities.

**Files.** src/core2/office-day-federal-president.ts, src/core2/modules/executive.ts, src/core2/modules/president-acts.ts
