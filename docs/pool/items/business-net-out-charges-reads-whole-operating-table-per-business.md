---
id: business-net-out-charges-reads-whole-operating-table-per-business
title: "Opening a place reads the whole operating table once per business in netOutCharges"
area: world
kind: bug
priority: 3
size: S
status: open
standard: 2
root: none
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: "Acting CTO comment on #9554, Nov 16 07:48Z, filed by the Train thread at the lead's order"
model: sonnet
effort: medium
---

**What.** `netOutCharges` in `src/core2/modules/business.ts` (line 969) queries the whole `operating` table (line 994) for every business as a world opens, so opening a large place costs businesses times rows. Guards: the speed and date rules.

**Cause.** Found in code: in src/core2/modules/business.ts, `netOutCharges` (line 994), the loop `for (const row of store(api).table("operating").query("all", [true]))` runs inside the per-business function and keeps only rows with `organizationId === dutiesOf && kind === "cost"`.

**Fix.** Group the cost shares by business in one pass over `operating` (or read an index by organization) and have `netOutCharges` look up its business's sum.

**Time box.** 1 hour, Sonnet.

**Rules.** Replace, never layer. Speed: nothing scans the whole table when something is indexed.

**Done when.** Opening a large place reads `operating` once, not once per business, with the same shares per business; `npm run speed:year` on a drawn large place shows the open time falls, named with its place and seed. A second session sees it in the running game: the same opening or the same monthly spend as before, at a place and seed it names.

**Waits on.** Nothing.

**Files.** src/core2/modules/business.ts

**Notes.** Filed by hand by the Train thread, Nov 16, from the acting CTO's note on #9554.
