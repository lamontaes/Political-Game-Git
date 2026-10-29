---
id: laws-local-income-tax-grant-by-bill
title: "A state legislature can grant or withdraw its towns' power to tax income by bill"
lead: laws-effects
area: laws
kind: wiring
priority: 2
size: S
status: done
claimed-by: claude/local-income-tax-grant-bill
pr: #6488
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T01:49:58.426Z
---

**What.** The state's grant of local income-tax authority is read when a local body drafts an income-tax bill, and a state law row can grant or withdraw it, but no body can propose, enact or repeal the grant by bill (stopgap SG-LAW-local-income-tax-authority-change, src/core2/modules/legislature.ts). The Words half is on main: #6432 (words-bill-section-local-income-tax-authority) added the bill-section row for granting and withdrawing it. What is left is the catalog half the stopgap names: a state-level grant and withdraw policy in the bill catalog (scripts/research/build-bill-catalog.py) and its power in series-powers.json, so a state chamber drafts it like any other law. It is the last open half of laws-nine-links-taxes other than the estate tax.

**Rules.** Wire to the world: the grant a state passes in play is read by the next local income-tax bill's authority check and by the payroll withholding that bill's tax would set, in a drawn place. One rule, all 56 places: the power comes from series-powers.json for every state, never a named one.

**Done when.** In a buildBenchWorld drawn place (seed named), a state chamber drafts and passes a bill granting (or withdrawing) local income-tax authority, the town's next income-tax bill's authority check cites that law's record id, the stopgap SG-LAW-local-income-tax-authority-change is cleared, and the law matrix's row for local-income-tax-authority grades the enact and repeal link wired, shown by a test.

**Files.** scripts/research/build-bill-catalog.py, src/core2/data/legislature/series-powers.json, src/core2/modules/legislature.ts, src/core2/data/stopgaps.json

**Notes.** Relayed by the CTO pass-runner Oct 28 00:30 from the Words lead after #6432 merged; split from laws-nine-links-taxes, whose estate-tax half stays blocked.

Oct 29 (CTO): set done; PR #6488 merged (the done flip failed while branch protection refused the flip job's push).
