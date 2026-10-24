---
id: play-golden-path-m0-13-red-st-johnsbury
title: "M0-13 is red on main in St. Johnsbury, Vermont on six played-year checks"
area: core
kind: bug
priority: 1
size: M
status: claimed
claimed-by: claude/quirky-ride-vrwwz4-m0-13-stj
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T14:28:36.399Z
---

**What.** The accepted spec M0-13 (tests/golden-path/played-world.node-test.ts) fails on main 663a38fedf in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4): heap growth 110.5 MiB a month against a 5 MiB ceiling; modules that never ran (public projects, succession, world races, ballot measures, past); 2 of 15 races with no one on the ballot (Commissioner and County treasurer, 2025-11-04); 9 of 2,830 homes with no value or rent; 7 of 42 people paid in the last month with no cash at the end; both new businesses borrowing more than 9 times the founder's cash (largest $215,153). Golden-path-year turned red on #5919 by this draw. Each failure may need its own item once triaged.

**Rules.** Wire to the world: every check M0-13 makes must hold in every drawn place's played year, so each failure is fixed at its engine, never by loosening the check.

**Done when.** The M0-13 command passes in St. Johnsbury, Vermont with the seed above and two more drawn places named with seeds, each failure's cause named by line in the PR (or split into its own item with the cause).

**Files.** tests/golden-path/played-world.node-test.ts

**Notes.** Triage Oct 24 (helper, branch claude/quirky-ride-vrwwz4-m0-13-stj, main 8a0497ab01). The six BROKEN lines are not what turns golden-path-year red: five of them are registered FAILING_TODAY entries the spec expects to be broken (every module; the three memory ceilings; every race has someone on the ballot, homes, pay and loan as byTown entries), and they print BROKEN identically on main here and in the CI log of 2cb06900b4. The one failing assertion in that CI job is `memory at the end stays under 2000 MB` (2,049 MB; this container, Node 22, main: 1,899 MB, passes; CI imports the engine at 399 MiB against 306 MiB here). Causes and items: heap is core-circle-decision-scores-heap (626 MiB of the 1,870 MiB retained heap is the focus people's last 30 days of person.acted scores); ballot is gov-empty-ballot-stay-out-and-late-vacancy; homes is world-housing-sold-and-removed-dwelling-rows-unpriced (also broken in Decaturville, Tennessee and Lawrenceville, Virginia); pay is world-counted-household-arrears-take-whole-paycheck; loan is tests-played-world-founding-means-ignores-savings (spec measure, owner call). The modules that never ran (public projects, succession, ballot measures, past in all three places; world races only here) belong to FIXER-WIRE-ALL-MODULES and are not red. Memory growth a month: 110.5 MiB here, 6.9 in Decaturville, 12.7 in Lawrenceville, all over the 5 MiB ceiling and all registered byTown, so not red either. No engine change made.
