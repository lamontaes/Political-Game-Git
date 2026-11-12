---
id: laws-congress-repeals-federal-income-tax-year-one
title: "Congress repeals the federal income tax in the first spring, and no paycheck withholds it after (M0-13 red, Exeter, New Hampshire)"
area: laws
kind: bug
priority: 1
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
root: none
source: Red desk, Nov 12 (golden-path M0-13 red on main, reported by merger sonnet-2015 on #7365)
---

**What.** In Exeter, New Hampshire (place 3325300, seed 24651c2168bd12fb3adf038269f2d809d148b12efdfd172209aa634c5dbb4dc0), Congress passes H.R. 18 on 2025-05-12, a repeal of `us-policy-positions:fiscal.adopt-income-tax`, and the federal income tax in force is 0 from that day: law row `law:US:federal:income-tax:general:2025-05-12:remove:law:US:federal:us-policy-positions:fiscal.adopt-income-tax:general:2025-05-12:H.R. 18`, value 0, which also outranks the 2026 bracket row. Golden-path M0-13 fails on clean main 7684a629: after 2026-01-01, 1,352 paychecks withhold Social Security, Medicare and other states' income tax, and no federal income tax. Every national outlet runs the story on 2025-05-12. Seen: the player's paycheck and the town's treasury reports show no federal income tax from the first May on, and the news says Congress abolished it.

**Cause.** Measured: Exeter, New Hampshire, seed 24651c2168bd12fb3adf038269f2d809d148b12efdfd172209aa634c5dbb4dc0, `node --import tsx` on a probe that builds `buildBenchWorld` with that seed and place, advances to 2025-12-30 and prints `lawInForceToday(api, "income-tax")`: the federal level holds the H.R. 18 repeal row. Congress's agenda in src/core2/modules/world-legislating.ts (`fileChanges`, members' `filingReason` and their `officialStance` on the question, since #8752 gave federal questions a direction measured from roll calls) takes up the same "adopt an income tax" question a state answers, and a majority whose stance leans against a state income tax votes the federal one away. Nothing a member weighs reads what the repeal does to the federal budget (about half of federal revenue). The repeal route itself has been enabled since #7352 (law-levels-federal-income-tax-adoption).

**Fix.** For the laws lead to choose, building through the one Congress engine: a member's reason on a fiscal question reads its effect on the government's own budget (the revenue the tax carries in the federal ledger) as well as their stance, so a repeal that leaves a hole of that size is filed and passed only where the members' reasons outweigh it, as real roll calls show. No fixed bar on the question, no dice, no federal-only code path. Then M0-13 passes in Exeter without changing the check, which already says the starting tax rows carry forward "until a law changes them".

**Time box.** 4 hours

**Rules.** No dice: the vote follows members' reasons, now including the budget the law moves, and never a seeded roll or a hard block on the question. Wire to the world: the repeal, where it happens, still reaches withholding, the federal ledger and the news by record id.

**Done when.** A second session plays a year in a drawn place in the running game and sees federal income tax on the paycheck in dev mode after January 1 unless Congress repealed it for a recorded reason; golden-path M0-13 passes on main at the Exeter place and seed above and in two fresh drawn places; a twenty-world sweep of the first played year counts how many worlds' Congress repeals the federal income tax, with the place and seed of each, and that count is set against the real record (no repeal since the Sixteenth Amendment).

**Waits on.** Nothing.

**Files.** src/core2/modules/world-legislating.ts, src/core2/law-reach/group-b-money.ts, tests/golden-path/played-world.node-test.ts
