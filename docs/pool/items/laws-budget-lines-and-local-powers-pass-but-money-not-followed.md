---
id: laws-budget-lines-and-local-powers-pass-but-money-not-followed
title: "Budget lines, amounts with no value in force and the 60 grants of local power were only shown to pass; nobody has followed their money (Marion, Mississippi)"
area: laws
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: low
root: rc8-law-judged-by-paperwork
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, "What I did not test here", and "What I ran, and what I could not verify")
checked: fable 2026-11-10
---

**What.** Three kinds of law in dev mode's list have been shown to pass and nothing more: budget lines, amounts with no value in force at a body, and the 60 grants of power to local government. In the Nov 9 law sweep in Marion, Mississippi (seed 7df73e53cd67) the audit set each to 1 of whatever unit it uses, which proves a bill passes and nothing more, and it did not follow the grants into a town using the power. Dev mode lists 170 laws there: 37 amounts, 73 yes-or-no questions and 60 grants. The audit's call: "do not count any of them as working until someone follows the money the same way." Run the sweep's twin-world money trace on each, with a real change in place of 1 unit, and file every law whose money does not move, or moves the wrong way, as its own item with its figures. Seen: the money a passed budget-line or local-power bill moves on the bill card (follows each to a paycheck, price or budget).

**Cause.** Measured: main's `docs/reports/law-wiring-matrix.json`, built by `scripts/law-wiring/check.ts` and `matrix.ts` from twin-world runs in 25 drawn places (read on main 903b659706), is the money trace this item asks for. It compares every cash account against a control world of the same seed and grades each law's money by the posts its own reader made. All 23 budget lines have money graded `wired`; 11 of them, all federal lines, miss only the outcome-web link, which `laws-three-federal-budget-lines-reach-nobody` already holds. The 58 grants of local power are graded `n/a` on purpose: a grant reaches no one, and the town law it enables is graded on its own row. Eight amounts are not followed to money. They are the three Social Security claim ages, the four state contribution limits (`state-contribution-limit-governor`, `-state-senate`, `-state-house`, `-local`) and `federal-campaign-contribution-limit`. Each has a reader that runs on an event: `recordAgesReach` in `src/core2/modules/retirement-claims.ts` (line 110) records the ages when a person reaches a claim, and the campaign engine reads the limits when a donor gives (`src/core2/modules/campaigns.ts`, lines 2865 to 2922). The checker's window is 35 days from the opening (`WINDOW`, `scripts/law-wiring/check.ts` line 79). Raising the earliest claim age from 62 to 68 in New Munich, Minnesota, or a state limit in Peacham, Vermont, in January 2025 meets no claimant and no donation in that window. So `reach`, `systems` and `money` grade missing or partial. The manual bench matrix the Done when asked for repeats this checker by hand.

**Fix.** Run the checker with a window that holds the event, one heavy run at a time: `node --import tsx scripts/law-wiring/check.ts --seed <drawn> --only social-security-earliest-claim-age,social-security-full-retirement-age,social-security-delayed-credit-age,state-contribution-limit-governor,state-contribution-limit-state-senate,state-contribution-limit-state-house,state-contribution-limit-local,federal-campaign-contribution-limit --days 400 --out <file>`, then `matrix.ts <file>` into a scratch copy, in two drawn places. A 400-day window holds the 2026 primaries' fundraising and a year of claimants. Record each law's grade with its `lawApplied` and journal record ids in the item's Notes. File each law whose money still does not move as its own item with its figures. Do not build the bench matrix by hand. Proposed: once that is recorded, the CTO closes this item.

**Time box.** 3 hours for one Sonnet session.

**Rules.** The chain is the acceptance: a budget line or a grant is finished only when one dollar or one rule is followed to a named person and back out, by record id; a bill that passes is not that. An effect is a read, not a record: a law row another engine never reads when it decides or pays is a placeholder, however many reach rows it writes. Wire to the world: the result is stated for the whole family (every budget line, every grant), not for a chosen example. One rule, all 56 places: a grant is followed in a place whose own state law lets the town use it, found from the place's data. Owner, November 8, quoted by the audit: "when it finds these errors or finds that these laws don't pass, I want them fixed. I don't just want a report of everything that was broken."

**Done when.** A second session reads the item's Notes and finds, for each of the eight amounts, its grade from a 400-day `check.ts` run in two drawn places (named with their seeds): either the money followed to a named person or campaign by `lawApplied` and journal record ids, or the id of the new item that holds it. It also finds the 23 budget lines and 58 grants cited from main's matrix by row.

**Waits on.** Nothing.

**Files.** src/core2/data/legislature/bill-catalog.json, src/core2/law-reach/group-b.ts (`runBudgetLine`, line 884), src/core2/budgets-treasury.ts, src/core2/modules/laws.ts (`LOCAL_POWER_PREFIX`, line 709), src/bench/dev-mode.ts (`lawSeriesCatalog`, line 347; `introduce`, line 735), scripts/dev-tests/law-run.ts, scripts/dev-tests/twin.ts

**Notes.** From the Fable audit, Pillar 2 ("What I did not test here") and its closing list: "What budget lines, amounts with no value in force at a body, and the 60 grants of local power do once passed. The sweep proved only that they pass." Nothing here is a measured defect yet; it is untested ground, filed so that nobody counts it as working. Checked on main, Nov 10: the bill catalog holds 60 `law:local-power:` policies, matching the audit's 60, and 23 budget-line policies. Two things to settle first. Dev mode's `introduce` builds only an amount or a yes-or-no section, and `lawSeriesCatalog` leaves the catalog's budget-line policies out of dev mode's law list, so on main a spending line cannot be introduced from the dev Bills panel; the audit does not say how its sweep reached budget lines, and they may be among its 37 amounts under another series. Either add budget lines to dev mode's one introduce route as part of this item, or draft them from a seat taken through Advanced, Play as, and force the vote from the bill page's dev card. And both dev mode and the harness add riders when votes are forced (`gov-riders-added-when-every-vote-is-forced`), so every pair must name the sections its bill left with. The audit's by-account sums came from its own script, which is not in the repository; `law-run.ts` prints people's cash and organizations' cash against its control and does not split counted households or governments, so the split is part of the work. If the matrix is more than one session can fill, split it by kind (budget lines, unset amounts, grants) into three items before building. Related: `laws-three-federal-budget-lines-reach-nobody`, `law-levels-specific-local-grants` (done), `laws-checker-grant-change-toggles`, `gov-passed-budget-changes-spending-red` (open), `office-budget-line-reaches-pay` (open), `wire-law-links-to-people` (open), `laws-wiring-every-law` (open).

Nov 11 (cause finder for Fable B): read main's law-wiring matrix on 903b659706. It is the twin-world money trace this item asks for. Budget lines move money, grants are graded on the town laws they enable, and only eight amounts are unfollowed. All eight are read on events (a claim, a donation) that the checker's 35-day window from the opening does not hold. The work left is one longer checker run, not a hand-built matrix.
