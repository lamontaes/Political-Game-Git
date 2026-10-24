---
id: traits-decisions-never-run
title: "The 23 personality decisions that never run in a played year run where their causes happen"
area: people
kind: wiring
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
---

**What.** Of 84 personality decisions, 61 ran in the Oct 20 played year and 23 never did. The causes were measured: no election inside the year (voting, the exit poll, canvassing, donating, polls, press), decisions only the player or the bench can start (a candidate asking someone to volunteer or endorse, a legislator asking for a hearing), a bribe never taken so its chain never starts, rare events (an appointment, a will, a recall vote), and a staffer always taking the case first. Make each run where its cause really happens, through the world's own actors, or record why it cannot in a gap row.

**Rules.** Wire to the world: a decision that never runs in play is an unregistered placeholder until a played year shows it. No dice: who acts follows their traits, reasons and records. Sliding scales and causes: recalls start from a recorded cause where the state requires grounds.

**Done when.** `scripts/traits/trait-wiring-matrix.ts` on a played year (`buildBenchWorld`, every module) in a drawn place whose year holds an election, seed named, shows each of the 23 with calls above zero and a decision record id, or a row in `data/content/trait-decision-gaps.json` naming the file and line that keeps it from running and the item that will start it.

**Files.** scripts/traits/trait-wiring-matrix.ts, data/content/trait-decision-gaps.json, src/core2/modules/campaigns.ts, src/bench/campaign.ts

**Notes.** Split Oct 24 by the CTO from `traits-wiring-audit` (order `docs/work-orders/lead-traits-2026-10-24.md`). The list with file and line for each is in `docs/reports/trait-wiring-2026-10-20.md`, "Decisions that never ran".

Sent back 2026-10-24 UTC from PR #5886 (branch claude/traits-decisions-never-run): Done-when row 2 lacks actual decision record IDs (examples only actor/date/result, some date only); row 3 appointments.weigh and housing.settle-arrears gap fixes name no tracked item; capture owning record IDs and link or file the missing bounded work; finish on that branch, merge main into it first.
