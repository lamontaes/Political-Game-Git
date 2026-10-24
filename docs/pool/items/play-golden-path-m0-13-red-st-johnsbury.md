---
id: play-golden-path-m0-13-red-st-johnsbury
title: "M0-13 is red on main in St. Johnsbury, Vermont on six played-year checks"
area: core
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The accepted spec M0-13 (tests/golden-path/played-world.node-test.ts) fails on main 663a38fedf in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4): heap growth 110.5 MiB a month against a 5 MiB ceiling; modules that never ran (public projects, succession, world races, ballot measures, past); 2 of 15 races with no one on the ballot (Commissioner and County treasurer, 2025-11-04); 9 of 2,830 homes with no value or rent; 7 of 42 people paid in the last month with no cash at the end; both new businesses borrowing more than 9 times the founder's cash (largest $215,153). Golden-path-year turned red on #5919 by this draw. Each failure may need its own item once triaged.

**Rules.** Wire to the world: every check M0-13 makes must hold in every drawn place's played year, so each failure is fixed at its engine, never by loosening the check.

**Done when.** The M0-13 command passes in St. Johnsbury, Vermont with the seed above and two more drawn places named with seeds, each failure's cause named by line in the PR (or split into its own item with the cause).

**Files.** tests/golden-path/played-world.node-test.ts

**Notes.** TODO
