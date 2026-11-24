---
id: money-town-tax-raise-leaves-its-own-treasury-no-richer
title: "A town raises its property tax and its own treasury ends no richer: the collector holds half and a reserve sweep sends the rest outside (Denver, Missouri)"
area: gov
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: money
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, "What the code does")
model: opus
effort: high
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** A property tax raise collects money that never reaches the government that raised it. Measured in Denver, Missouri (the audit gives no seed), by the payments' own labels, 90 days after a raise from 0.817% to 2% and against a twin world with no raise. The county tax collector took in about $385,000 more in property tax: about $380,000 from people and about $5,000 from other accounts. After 90 days it still held $192,000 and had passed the other $193,000 on to governments. A step the game calls a reserve sweep then moved all but about $800 of that $193,000 out again, to the account that stands for everything outside the game's books. The $800 stayed with the Missouri treasury. So the village's and the county's own treasuries ended with nothing more, and the collector was still holding $192,000 it had not paid out. Fix it at the cause, for every government that levies a tax: what a tax collects is passed on to the government whose law levied it, on the schedule the collector pays, and that government's treasury keeps or spends it by its own budget, so a raise shows up as money the body can spend. Seen: the town budget screen after the player's property tax raise passes; the town's own revenue must rise.

**Cause.** Found in code: src/core2/modules/budgets.ts remitPropertyTax (line 1210) splits by budgeted tax per resident, not by who levied; budgets-treasury.ts sweepReserves (line 1631, SG-GOV-reserve-sweep) sends the excess to the outside account.

**Fix.** Remit to the levying government and stop the sweep carrying a raise out the month it arrives.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: one tax dollar is followed from the owner who paid it to the collector, to the treasury of the government that levied it, and on to what that treasury spent it on, by record id. Wire to the world: a raise that leaves the town's treasury unchanged moved no money the town can use. An effect is a read, not a record: the budget of the government that raised the tax must read the higher collection when it next pays or votes. Owner, November 8, quoted by the audit: "they've got to spend money... They should be passing stuff."

**Done when.** A second session, not the builder, runs this in the running game. Start the bench (`OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" npm run bench`, play at `/play`) with the Place field empty so the place is a drawn place, and write down the place and seed the title shows; redraw until the place has a town board that may set the property tax. In dev mode's Bills panel on the Government screen introduce a one-section property tax raise at that board, set the Margin to 3 and the Executive to Signs, press Pass, and run 90 days in the Run panel. Start a second game on the same place and seed, pass nothing, and run the same 90 days. Compare the two worlds' cash by account: the tax collector, the town's treasury, the county's treasury, the state's treasury and the outside account, with each payment between them named by its own label (the property tax bill, the collector's remittance, the reserve sweep). The town's own treasury, or the spending it paid from that treasury, must be higher than the twin's by its share of the extra collection; the collector must hold no more than one period's collections; and no sweep may carry the raise to the outside account in the month it arrives. Then the same check as a named repro in Denver, Missouri (0.817% to 2%, 90 days; the place is named, the seed is whatever the bench draws for it and is written in the proof), and a test on a drawn place that fails when the levying treasury ends level with its twin. The owner plays it: he raises the town's tax, opens Budgets a season later, and the town has more money than it had.

**Waits on.** laws-property-tax-billed-to-every-home-in-the-world (open): fix that first, or read both together, since it decides who pays the tax in the first place.

**Files.** src/core2/modules/budgets.ts (`remitPropertyTax`, line 1210, called from `closeMonth`, line 1008; `taxCollector`, line 1180), src/core2/budgets-treasury.ts (`sweepReserves`, line 1631), src/core2/data/stopgaps/gov.json (SG-GOV-reserve-sweep)

**Notes.** From the Fable audit, Pillar 2: the Denver, Missouri tax raise passed through the real board 4 to 1, then traced account by account against its twin, and the tax money followed by the payments' own labels. All figures above are measured. Read on main, Nov 10, not measured: `remitPropertyTax` splits the collector's balance among the state, county and city by each one's budgeted property tax per resident (a Census figure), not by whose law levied the tax or by how much the rate rose, which is how $800 can reach the state treasury; and `sweepReserves` sends whatever a state or local treasury holds above a reserve sized from its budgeted spending to the outside account at each monthly close (registered stopgap SG-GOV-reserve-sweep, added Nov 8), so a treasury whose budget did not grow with the raise sweeps the raise away. The audit did not trace why the collector still held $192,000 after 90 days when the remittance runs at each monthly close. Related: `laws-property-tax-billed-to-every-home-in-the-world` (who pays the tax in the first place; fix that first or read both together), `economy-outside-money-loop` (open, lead money; its Nov 8 notes list reserve-sweep among the flows through the outside account). The audit ran this in one town only.

Nov 10, Fable (dev mode's money check, first use): in Athol, Idaho (seed df2365fa-000c-47d9-a59d-ba3962a7f26e) a state corporate income tax raise to 31.56 percent, passed with no added section and run 45 days past its effective date, moved $106,328 by the employer-tax engine's own records. Against the same world left alone, businesses ended $46,748 lower and banks $21,235 lower, yet governments ended $3,823 lower and $55,540 was outside the books. The same pattern as the town tax above, at the state level. Screenshot: docs/seen/docs-acceptance-rule-seen-in-the-game/built-02-follow-the-money.jpg.
