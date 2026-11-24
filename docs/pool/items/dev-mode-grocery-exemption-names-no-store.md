---
id: dev-mode-grocery-exemption-names-no-store
title: "The grocery tax exemption's reach names the buyers and no store"
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

**What.** Dev mode's reach for a grocery tax exemption names the households that pay less tax, and no store. Enacting one at Pierre, South Dakota reached 337 people and 20,109 counted for $3.4 million, while the stores whose prices and sales it changed are not listed. Ending one raised prices 2.4% to 3.7% at every store in seven towns and cut 2 to 14 store jobs. Seen: dev mode's bill card and the law page for the grocery exemption.

**Cause.** Measured: Pierre, South Dakota, seed ilt-pierre, and West Union, Ohio (3984294), seed ilt-west-union (stores-health-services.md finding 8). Found in code: `GROCERY_SELLERS` in src/core2/modules/budgets.ts (line 1123) marks every retail store as a grocery seller with a share of its sales exempt, and the exemption writes reach rows only for buyers.

**Fix.** Where `syncSalesTax` in src/core2/modules/budgets.ts applies the exemption to a store's sales, it writes the store's exempt sales under the exemption's law id, so `lawReach` names each store with its dollars. The bill card lists the stores beside the buyers.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** Every effect can be triggered from the game's own code in dev mode and its effect seen and traced there: this item is the trace a script needed. Wire to the world: the fix reads the reach and trace records the engines already keep and adds no second reader.

**Done when.** A second session, in dev mode in the running game at a place and seed it chose where groceries are taxed, enacts a grocery exemption, advances a month and opens the bill card: it names each store with its exempt sales and the buyers with their tax saved, by record id.

**Waits on.** Nothing.

**Files.** src/core2/modules/budgets.ts, src/core2/law-reach/applied.ts
