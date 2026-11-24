---
id: dev-mode-cost-counts-toward-layoffs
title: "Dev mode cannot say whether a law's cost counts in the books that decide layoffs"
area: laws
kind: feature
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

**What.** Most laws charge a business from cash the layoff decision never reads, so they move money and no jobs. Dev mode shows the dollars each business paid and never says whether that cost entered the month the business weighs when it cuts staff. The tracers read the code to learn it. Seen: dev mode's bill card, What this did.

**Cause.** Found in code: `bookedMonth` in src/core2/modules/business.ts (line 918) builds the month a business weighs; costs paid outside it, such as profit tax swept from an outside parent's share by `sweepToParent` (line 859), are not in it. Measured: factories-freight.md, What dev mode could not show (price laws row).

**Fix.** Each reach row for a business says whether its cost was in the booked month `bookedMonth` read, and the bill card marks the dollars that counted toward staffing beside the rest. It reads what the engine already decides.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** Every effect can be triggered from the game's own code in dev mode and its effect seen and traced there: this item is the trace a script needed. Wire to the world: the fix reads the reach and trace records the engines already keep and adds no second reader.

**Done when.** A second session, in dev mode in the running game at a place and seed it chose, passes a carbon price and a corporate income tax raise, advances two months and opens each bill card: each business's dollars are marked as counted toward staffing or not, matching its booked month, by record id.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/core2/modules/business.ts
