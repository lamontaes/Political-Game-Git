---
id: research-american-samoa-bank-deposits
title: "Research: American Samoa's bank deposits, from its territorial banking regulator or its banks' own reports"
area: world
kind: research
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: researcher
model: sonnet
effort: medium
root: none
source: stand-in triage T4 (Nov 10, 2026), docs/stopgaps/triage-2026-11-10/world.md
claimed-at:
---

**What.** American Samoa has no bank branch in the FDIC Summary of Deposits, so its town bank starts with the nation's deposits per resident times its people.

**Cause.** Found in code: src/core2/modules/credit.ts line 149 (stopgap SG-WORLD-credit-island-deposits) falls back to `fallbackDeposits` when the county deposit table has no row for the place.

**Fix.** Find American Samoa's total bank deposits (the territory's banking regulator, the Government of American Samoa's financial reports, or its banks' own reports), quote it from a fetched page, and add it as a SOURCED or ESTIMATED row beside the county deposits table with its citation and spread. If none is reachable, say what was tried and leave the row open.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Research calibrates, never decides. Estimate, never UNKNOWN: a value a player can see starts from the real average with a spread and its source.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`) in an American Samoa place (seed named in the PR body) and sees the town bank's opening deposits equal the sourced figure by the bank's record id, and the stopgap row resolved.

**Waits on.** Nothing.

**Files.** src/core2/modules/credit.ts, data/tables/town-deposits.json, src/core2/data/stopgaps/world.json
