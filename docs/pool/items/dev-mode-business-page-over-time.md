---
id: dev-mode-business-page-over-time
title: "Dev mode has no page for a business over time: staff, sales, cuts and its closing date"
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

**What.** A business that shrinks or closes cannot be followed in dev mode. The tracers read the books month by month with scripts to see Thief River Falls' wholesaler (1,848 workers) and Center's utility close with no law passed. The records exist (`business.staff-reduced`, `business.closed` and the business books), but no dev mode view lists them. Seen: dev mode in the running game, which has no business view.

**Cause.** Found in code: `business.staff-reduced` and `business.closed` are written by src/core2/modules/business.ts and read by the paper (src/bench/printed-words.ts) and memory (src/core2/data/life/remembered.json); no view in src/bench/dev-mode.ts reads them. Measured: factories-freight.md finding on Thief River Falls and Lebanon, Kentucky (2144344), seed ind-2144344.

**Fix.** A dev mode business view (src/bench/dev-mode.ts and its panel) that reads a business's book and its staff-reduced and closed records month by month: staff, sales, cash, each cut and the closing date with its reason. It reads the records that exist and writes none.

**Time box.** 4 hours for one Sonnet session at medium effort.

**Rules.** Every effect can be triggered from the game's own code in dev mode and its effect seen and traced there: this item is the trace a script needed. Wire to the world: the fix reads the reach and trace records the engines already keep and adds no second reader.

**Done when.** A second session, in dev mode in the running game at a place and seed it chose, opens a business that cut staff in the year and sees its staff, sales and cash by month, each cut and, for one that closed, the closing date and reason, by record id.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/bench/dev-api.ts, src/bench/data/controls.json
