---
id: tests-bill-orders-governor-order-has-no-name
title: "An executive order the governor decides shows with no name on the orders screen"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: governing
model: sonnet
effort: medium
source: views thread, Nov 16 (trial batch of bench pins)
---

**What.** At Cassoday, Kansas (2010925), world seed dfac6a2adae9340d902f5eab265dc0bf045dbda7e35fc30c73c1af806803b63e, the player playing the governor opens the orders screen and the first order waiting on them has no name: `ordersView` returns an entry whose `name` is null (src/bench/bill-orders.test.ts about line 59). The player would see an order to decide with nothing saying what it is.
Seen: on the Train at 6d12556a in the trial batch, by `npx vitest run src/bench/bill-orders.test.ts` with its fixed seed.

**Cause.** Needs cause. Looked at: only the failing assertion and the place it failed in.

**Fix.** None until the cause is found.

**Time box.** 2 hours, Sonnet at medium effort.

**Rules.** No hand-written player text in code; a screen shows only what the records hold.

**Done when.** The pinned case passes on the Train with the cause named in the PR body by record, and a second session runs the file and then replays the case in a drawn place.

**Waits on.** Nothing.

**Files.** src/bench/bill-orders.test.ts, src/bench/office.ts

**Notes.**
