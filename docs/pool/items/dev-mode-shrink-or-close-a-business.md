---
id: dev-mode-shrink-or-close-a-business
title: "Dev mode has no control to shrink or close a business and trace who it hit"
area: play
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
source: Laws thread's dev-mode gap list from the three industry-law traces and the Account lead's industry report (/mnt/project-files/laws/reports/dev-mode-gaps-from-industry-traces.md); filed on the lead's ruling, Nov 16, 2026, under the owner's rule of Nov 16 that whatever a session traces by script dev mode should show
model: sonnet
effort: medium
root: rc2-done-from-records
---

**What.** The owner's plant-town case cannot be caused in the game. The freight tracer closed Lebanon, Kentucky's 430-worker plant by cutting its outside orders with the engine's own output limit, called from a script, then traced who lost work, who moved and what the budget lost. Dev mode has no such control. Seen: dev mode in the running game, which has no business control.

**Cause.** Measured: Lebanon, Kentucky (2144344), seed ind-2144344, plant closed Sep 1, 2025 by the output limit (factories-freight.md finding on Lebanon). Found in code: src/bench/dev-mode.ts has `forceLayoff` for one person and no control on a business.

**Fix.** A dev mode control that cuts a business's orders through the engine's own output limit (the same call the script used), so the business shrinks or closes by its own rules, followed by the job-loss and business views (dev-mode-who-lost-a-job-and-why, dev-mode-business-page-over-time).

**Time box.** 4 hours for one Sonnet session at medium effort.

**Rules.** Every effect can be triggered from the game's own code in dev mode and its effect seen and traced there: this item is the trace a script needed. Wire to the world: the fix reads the reach and trace records the engines already keep and adds no second reader.

**Done when.** A second session, in dev mode in the running game at a place and seed it chose, cuts the largest employer's orders, advances until it closes or cuts staff and sees the closing, the workers who lost work and the town's tax and jobs change, by record id.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/bench/dev-api.ts, src/core2/modules/business.ts
