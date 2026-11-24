---
id: nation-president-orders-by-series-part-2-reversal-and-reader
title: "The next President reverses an order by their own view, and an engine reads the change months later"
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
model: sonnet
effort: medium
root: rc7-player-cannot-drive
source: split from nation-president-orders-by-series in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** An unplayed President already weighs and issues the one federal order in president-acts.ts. Prove and, where it fails, fix the back-and-forth: the next President of the other side reverses an order by their own view, a law row for the series is in force from the next day citing the order and the President, and an engine reads it (the climate emissions index for the power-plant series, 24 months on). This is part 2 of nation-president-orders-by-series. Seen: a federal law row changing the day after a new President reverses an order, and the economy reading it months later.

**Cause.** Found in code: `presidentialOrderDecisions` and `issueFederalOrder` in src/core2/modules/executive.ts are called from src/core2/modules/president-acts.ts; no test follows an order, its reversal and a downstream reader across two Presidents.

**Fix.** Write the two-President test through a played world, fix whatever stops the reversal or the reader, and keep the President's decision a function of their view of the question and the law now (`viewOn`), never a roll.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the President decides from their own view and the law now. An effect is a read, not a record: the law row an order writes must be read by an engine at the moment it decides. The chain is the acceptance: order, law row, reader, by record id.

**Done when.** A second session, not the builder, plays a long enough world (buildBenchWorld, a place drawn from all 56, a seed nobody chose, named) for a change of party in the White House and sees the first President's order cited by a law row from the next day, the next President's reversing order, and the emissions index reading the series 24 months on, by record id.

**Waits on.** nation-president-orders-by-series-part-1-more-series-authorities.

**Files.** src/core2/modules/executive.ts, src/core2/modules/president-acts.ts, src/core2/modules/climate.ts, src/core2/data/executive/federal-orders.json
