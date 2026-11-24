---
id: dev-mode-tariff-outside-buyers-ignore-price
title: "Dev mode credits a tariff with higher plant prices that outside buyers never paid"
area: laws
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: Laws thread's dev-mode gap list from the three industry-law traces and the Account lead's industry report (/mnt/project-files/laws/reports/dev-mode-gaps-from-industry-traces.md); filed on the lead's ruling, Nov 16, 2026, under the owner's rule of Nov 16 that whatever a session traces by script dev mode should show
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** After a tariff raise, dev mode credited Lebanon, Kentucky's plants with $1.31 million of higher prices at 540 days. Their sales did not move, because outside buyers pay by the sector's national sales, not the plant's price. The card reads as a gain that never reached the books. Seen: dev mode's bill card for a tariff.

**Cause.** Measured: Lebanon, Kentucky (2144344), seed ind-2144344, 540 days against the same world with no bill (factories-freight.md, the tariff finding). Found in code: the price reach follows the outcome web's `tariffs-to-prices` link (src/core2/data/outcome-web/coverage.json), while outside sales are set from the sector's national sales.

**Fix.** Where the price reach records a tariff's price change on a business that sells outside, it records the sales that price actually brought in (from the outside-sales records), so the bill card shows what reached the books.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** Every effect can be triggered from the game's own code in dev mode and its effect seen and traced there: this item is the trace a script needed. Wire to the world: the fix reads the reach and trace records the engines already keep and adds no second reader.

**Done when.** A second session, in dev mode in the running game at a place and seed it chose with a plant that sells outside, raises tariffs, advances past the link's year lag and opens the bill card: the plant's dollars match the change in its outside sales, by record id.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/core2/law-reach/applied.ts
