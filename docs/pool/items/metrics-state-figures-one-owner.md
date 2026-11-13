---
id: metrics-state-figures-one-owner
title: "The state's figures come from one engine, by year: two functions named stateFigures give different answers"
area: gov
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: metrics-output-numbers-registry
blocked-on:
lead: nation
model: sonnet
effort: medium
root: none
source: docs/design/output-numbers.md (#8926), owner's ask of Nov 12
---

**What.** Two functions both named `stateFigures` give different figures for the same state and month: the regional model's months, which never read the town, and the state agenda's. In the six-year game the town's unemployment read 15% while the state stood at 4.6%, from two engines. The country tier already holds each state's people, jobs, pay, prices, sales and ledger and the state legislatures already read it, so it is the one owner; the regional months stay as the town's region inside its state and stop being read as the state. Seen: Metrics' state unemployment, jobs, pay, prices and people, with a years table.

**Cause.** Found in code: two functions both named `stateFigures` (src/core2/regional-model.ts:293 and src/core2/modules/world-legislating.ts:1541) give different figures for the same state and month.

**Fix.** The country tier writes a December row per state through the registry. The screen and the state agenda both read it, and the second function is deleted.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic (owner, Oct 27): the engine that already holds the figure writes it once, and every view reads that row; a screen that computes its own version is a duplicate to delete. One model, two tiers (owner, Oct 14): the state's sums count the town once, as the open item that makes the town count inside its state (core-country-tier-town-joins-its-state-part-4-the-town-counts-inside-its-state) asks. Replace, never layer (owner, Oct 14): the old counting code is deleted in the same pull request, and the pull request body counts what was removed.

**Done when.** A second session plays two years in a drawn place, naming the place and seed, and Metrics' state figures equal the state's December row in dev mode.

**Waits on.** metrics-output-numbers-registry.

**Files.** src/core2/regional-model.ts, src/core2/modules/world-legislating.ts, src/bench/metrics.ts

**Notes.** From docs/design/output-numbers.md (#8926), owner's ask of Nov 12.
