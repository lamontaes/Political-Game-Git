---
id: dev-mode-twin-null-bill-jobs-sales-pay-by-industry
title: "Dev mode's comparison with the town left alone compares cash only, and not against a bill that changes nothing"
area: laws
kind: feature
priority: 2
size: M
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

**What.** To learn what a law did to an industry's jobs, sales and pay, the tracers ran twin worlds by script, because dev mode's comparison reads cash only. They also found that passing any bill moves the world a little, so the fair comparison is the same town given a bill that changes no law. Without both, a law's effect on jobs cannot be seen in the game. Seen: dev mode's comparison panel (twinMoney).

**Cause.** Found in code: `twinMoney` in src/bench/dev-mode.ts (line 730) compares cash only. Measured: Choteau, Montana (3014650), seed ilt-3014650: the utility stays open in the plain world and closes in every world where any bill passed, the null bill included (farms-mines-energy.md finding 10).

**Fix.** `twinMoney` runs its twin with a bill that restates a law already in force, passed through the same dev mode route, and compares staff, sales, wages and cash by industry and by business as well as cash. The panel shows the differences, with the noise the null bill sets.

**Time box.** 5 hours for one Sonnet session at medium effort.

**Rules.** Every effect can be triggered from the game's own code in dev mode and its effect seen and traced there: this item is the trace a script needed. Wire to the world: the fix reads the reach and trace records the engines already keep and adds no second reader.

**Done when.** A second session, in dev mode in the running game at a place and seed it chose, passes a state minimum wage raise, advances three months and opens the comparison: it shows staff, sales and pay by industry and by business against the null-bill twin, and a business whose staff fell is named, by record id.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/bench/dev-api.ts, src/bench/dev-acceptance.test.ts
