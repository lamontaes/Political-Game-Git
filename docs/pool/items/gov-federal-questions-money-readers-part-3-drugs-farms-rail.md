---
id: gov-federal-questions-money-readers-part-3-drugs-farms-rail
title: "Drug price negotiation, farm subsidies and passenger rail, once enacted, change a payment and a budget line"
area: gov
kind: wiring
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: opus
effort: high
root: rc8-law-judged-by-paperwork
source: split from gov-federal-questions-money-readers in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Write the effect reader for Medicare drug price negotiation, farm subsidies and passenger rail: the enacted law row changes a federal rate or an outlay that the federal budget, payroll withholding or a household's check reads. Reuse the engines that exist and add data rows for the terms in `src/core2/data/laws/reach-group-a.json`, with the reader in `src/core2/law-reach/group-a-money.ts` or the engine that pays or taxes. Counted groups pay or receive by the same rule times their count. Feeds: gov-federal-questions-money-readers.

**Cause.** Found in code: `src/core2/law-reach/group-a-money.ts` and `src/core2/data/laws/reach-group-a.json` hold reach rows for money questions (`budgetToday` there reads a government's budget in force and `baseLine` a line's amount), and none yet reads Medicare drug price negotiation, farm subsidies and passenger rail.

**Fix.** Add the data rows and the reader hook in the engine that decides the payment or tax, so the enacted row changes the amount on the day it is paid, and the federal budget line follows; word the journal line through the English engine.

**Time box.** 8 hours for one opus session.

**Rules.** An effect is a read, not a record. The chain is the acceptance: one law followed to a named person's check or tax and back to the director's journal line. One model, two tiers. One rule, all 56 places. No hand-written player text. Compare against a twin world with no law.

**Done when.** A second session plays a one-year world in a place drawn from all 56 (named with its seed) with the question enacted through dev mode, against a twin world with none, and sees: each changes a named firm's or person's payment and a budget line, by record id. The journal line for the person is worded by the English engine.

**Waits on.** gov-congress-passes-policy-laws (or dev mode's enact-a-law route) so the law can be enacted.

**Files.** src/core2/law-reach/group-a-money.ts, src/core2/data/laws/reach-group-a.json, src/core2/modules/laws.ts, src/core2/modules/budgets.ts
