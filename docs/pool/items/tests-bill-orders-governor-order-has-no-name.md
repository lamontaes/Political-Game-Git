---
id: tests-bill-orders-governor-order-has-no-name
title: "An executive order the governor decides shows with no name on the orders screen"
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/long-game-mark-bill-orders
pr: #9766
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

**Cause.** Measured: at Cassoday, Kansas, seed pin-bill-orders:0 (world seed dfac6a2a…3e), by `ORDERS_SEED=pin-bill-orders npx vitest run src/bench/bill-orders.test.ts`, no executive order reaches the governor's desk in 200 days; the entry the test read was another kind on the desk. Found in code: `ordersView` in src/bench/office.ts gives `name: null` to a budget, a hearing, an address and the president's requests by design, and the orders screen in src/bench/play.mjs titles those by their kind's words, so the player sees each one named. The test took `orders[0]` whatever its kind.

**Fix.** The test takes the first entry of kind `order`, draws its seed again (`ORDERS_SEED` or `GOLDEN_PATH_SEED` replays one), and names every place it passed over. Nothing changes in the game: the player already sees each entry named.

**Time box.** 2 hours, Sonnet at medium effort.

**Rules.** No hand-written player text in code; a screen shows only what the records hold.

**Done when.** The pinned case passes on the Train with the cause named in the PR body by record, and a second session runs the file and then replays the case in a drawn place.

**Waits on.** Nothing.

**Files.** src/bench/bill-orders.test.ts, src/bench/office.ts

**Notes.**
Nov 16 (Long game): drawn at seed 96f9a82771c52267 it passed at Summerhaven, Arizona; at seed pin-bill-orders it passed over Cassoday, Lincoln NH, Morgan GA and Vatia AS and passed at West Louisville, Kentucky.
