---
id: research-cash-welfare-time-limits-by-state
title: "Find each state's cash welfare time limit, work hours and hardship exemptions"
area: laws
kind: research
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "asked for by the Account lead on the welfare time limit: every state uses the federal 60 months and 30 hours, Nov 14"
claimed-at:
after:
lead: account-lead
model: sonnet
effort: medium
root: rc9-place-facts-one-default
checked: sonnet 2026-11-14
---

**What.** The cash welfare line stops a family's cash assistance after a lifetime count of months and applies a work rule of weekly hours, and both use the federal defaults (60 months, 30 hours) in every state. The 1996 welfare act lets states set shorter limits, exempt a share of cases for hardship and set their own work hours, and several do. Replace the single default with each state's own limit, hours and hardship share. Seen: the three rows `tanfTimeLimitMonths`, `tanfWorkHoursPerWeek` and `tanfChildBelowAge` in `src/core2/data/laws/reach-group-b-parameters.json` are read by state, and a state with a shorter limit stops a family at its own month.

**Cause.** Found in code: `welfareTimeLimit` in `src/core2/law-reach/group-b.ts` reads the three national rows for every state; their source text says the figures are the federal rule, unverified here (Personal Responsibility and Work Opportunity Reconciliation Act of 1996, 42 U.S.C. 607 and 608), written from knowledge and not checked against the text.

**Fix.** Design: read the federal text and the Urban Institute and Congressional Research Service state tables of cash assistance rules, record each of the 56 places' limit (months, or none), required hours, and the hardship exemption share with its citation in the place's own data row, then make `welfareTimeLimit` read the place's row with the national one as the fallback marked ESTIMATED.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, write what was read in the item and stop.

**Rules.** One rule, all 56 places: place facts live in data rows, never in logic; research before building: real tables calibrate the limit and never decide one family's outcome; estimate, never unknown.

**Done when.** A second session, not the builder, opens the data rows for three drawn places named in the item and sees a quoted table cell for each limit, then runs the assistance work requirement case of `npx vitest run src/core2/law-reach-group-b.test.ts` at a drawn place and seed it names and sees heads stop at that place's own month.

**Waits on.** The welfare time limit folding.

**Files.** src/core2/law-reach/group-b.ts; src/core2/data/laws/reach-group-b-parameters.json

**Notes.** Found while building the welfare time limit.
