---
id: gov-m3-01-phase-in-by-dated-steps
title: "A bill drafted from the player's seat can phase in an amount by dated steps, and the law in force follows each step"
area: gov
lead: governing
kind: feature
priority: 2
size: M
status: claimed
claimed-by: governing/phase-in-dated-steps
pr:
blocked-on:
source: governing lead Oct 29
claimed-at: 2026-10-30T07:20:28.526Z
---

**What.** M3-01's test sentence gives a drafted ordinance an optional phase-in, and the owner ruled that bills can phase in by dated steps or a percent a year (DECISION-REGISTER, Sept 12 travel clarification, item 1). The catalog's `provisionFor` takes one optional `effectiveDate` per section, and legislature.test.ts drafts one raise dated later, but no test drafts two dated steps of the same amount and follows the law in force through each date. The player's route has none at all: `seatAct` in src/bench/legislature.ts takes no date. Let the seat draft a phase-in as dated sections of one bill and prove each step takes effect on its date.

**Rules.** Sliding scales and causes: each step changes the law on its own recorded date, read by the laws engine's calendar, never by a flag that flips at once. Replace, never layer: the phase-in is sections of the one bill record with their dates, never a second bill or a second schedule. One rule, all 56 places: the place is drawn from all 56.

**Done when.** A test in a drawn place built with buildBenchWorld and the seed it prints drafts a minimum-wage or budget amount in two dated steps through `seatAct`, passes it by the body's vote, and finds `lawInForce` at the first step's amount the day after the first date and at the second step's amount the day after the second, with each law row naming the bill by record id; the M3-01 command names the test file.

**Files.** src/bench/legislature.ts, src/core2/bill-catalog.ts, src/core2/modules/legislature.ts, src/bench/bill-paper.test.ts

**Notes.** Filed by the governing lead, Oct 29, from the M3-01 command (branch governing/m3-spec-commands). src/bench is the lane's; ask before editing. A percent-a-year phase-in is the ruling's other form; build the dated steps first and register the other as a stopgap if it is not built in the same unit.
