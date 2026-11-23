---
id: gov-past-votes-skip-the-states-local-power-bar
title: "A New Jersey borough council's past votes include a graduated income tax that New Jersey bars its places from taking up"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: "Owner's Nov 23 sitting, row C6 (docs/coordination/playtest/2026-11-23-1.md, PR #10292)"
checked:
claimed-at:
---

**What.** A New Jersey borough council's record shows it passed a graduated income tax on Aug 3, 2024. New Jersey places may not levy a general income tax (only Newark and Jersey City may levy a payroll tax), and the live bill catalog already bars the question at the city level. The player reads a council record of a power the council never had. Seen: the borough's history before day one, in Politics and the news.

**Cause.** Found in code: the function buildPriorTerms in src/core2/past-laws.ts (the `askable` list) takes each chamber's questions from the static bill catalog by level, where the income-tax series is listed at city and county level, and never asks policyAuthority in src/core2/policy-authority.ts, the check the live catalog applies. Measured: Allamuchy, New Jersey (3400640), seeds c6b and c6c, main 7f04c334: record module "votes" held a graduated-income-tax vote for office:gus2025:208755:board.

**Fix.** Filter `askable` by policyAuthority for the chamber's level, so a chamber only votes on questions its level may take up.

**Time box.** 1 hour.

**Rules.** One rule, all 56 places: the filter reads the state's own law and the powers catalog; no state is named in code.

**Done when.** A second session builds a world in a drawn New Jersey place (naming the seed) with buildBenchWorld and finds no vote on fiscal.graduated-income-tax for a city or county body in the record module's votes table, by record id, while state and federal bodies keep theirs, and sees the council's record in the running game with no income tax vote.

**Waits on.** Nothing.

**Files.** src/core2/past-laws.ts
