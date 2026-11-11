---
id: gov-fee-level-by-bill
title: "A council bill can set a government fee's level (a park or transit fee), and the charges paid move with it"
area: gov
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: governing
standard: 2
model: opus
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** No bill sets a charge's level: a government's charges move only with its budget's charges line (stopgap `SG-GOV-fee-level-by-bill`). The owner ruled the question Oct 24: yes, a council can set a fee level by bill where its powers allow; the fee is a law row the treasury reads. Let a council bill change a named fee's level in place data, read by the charge payment at the moment it is paid, so the payers pay the new level and the budget's charges line follows. The player would notice that raising a park or transit fee costs the people who use the park or ride. Seen: a council bill that sets a fee level, and the payers paying the new level (owner, Oct 24: yes, a council can).

**Cause.** Design: owner ruling Oct 24, "Fees set by bill: yes, a council can set a fee level by bill where its powers allow" (`docs/coordination/OWNER-DECISIONS.md`, line 669). Found in code: `src/core2/budgets-service-charges.ts` registers `SG-GOV-fee-level-by-bill` at line 232; row in `src/core2/data/stopgaps/gov.json`.

**Fix.** Let a council bill set a named fee's level in place data, read by the charge payment when paid, riding the existing bill and payment writers with no new player step; mark the stopgap resolved.

**Time box.** 6 hours for one opus session.

**Rules.** An effect is a read, not a record: the fee in force is read when the charge is paid. No dice. One rule, all 56 places: fee schedules live in place data. This is a game, not a spreadsheet: no new player step.

**Done when.** A second session plays a year in a drawn place (named with its seed, not chosen by the builder), passes a council bill that raises a park or transit fee, and sees the named payers' next payments of that fee rise by record id and the budget's charges line move; `SG-GOV-fee-level-by-bill` is resolved in `src/core2/data/stopgaps/gov.json`.

**Waits on.** Nothing.

**Files.** src/core2/budgets-service-charges.ts, src/core2/modules/budgets.ts, src/core2/data/stopgaps/gov.json

**Notes.** Split from gov-outside-revenue-fees (#5926). The owner question is under Open in docs/coordination/OWNER-DECISIONS.md.

Deferred Oct 25: nothing on screen reads it yet.
