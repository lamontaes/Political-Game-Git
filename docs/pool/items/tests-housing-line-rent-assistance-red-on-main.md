---
id: tests-housing-line-rent-assistance-red-on-main
title: "The housing line test fails on main in Bellair-Meadowbrook Terrace, Florida: raising the line pays no household's rent assistance"
area: laws
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/tests-housing-line-town-share
pr: #6602
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T07:53:33.353Z
---

**What.** On main at 71f22eaf8b, src/core2/law-wiring-housing.test.ts case 'the housing line: raising it pays a household's rent assistance through the journal' fails with GOLDEN_PATH_SEED=12eedd80c1bf47153f8335a6c767638897b90d18, drawn place Bellair-Meadowbrook Terrace, Florida (1205025, world seed 479d58a2a24f46ffbeda24b2f6ff43f940ad3eb044a3c16ed4b0627caadc8590): the check named housing reports one miss. Found by the laws-and-effects lead while testing the farmland PR, which does not touch the housing line; it reproduces identically on clean main.

**Rules.** AGENTS.md, an effect is a read, not a record: a raised housing line must reach a named household's rent through the journal, or the test names why not by record id; one rule, all 56 places: the cause is fixed for every place, not this one.

**Done when.** With GOLDEN_PATH_SEED=12eedd80c1bf47153f8335a6c767638897b90d18 the test passes in the drawn place, naming the household's rent assistance payment by journal record id or the recorded reason no household qualified, and it still passes on three fresh random seeds; the cause is written in the PR body with file and line.

**Files.** src/core2/law-wiring-housing.test.ts,src/core2/housing-assistance.ts,src/core2/modules/budgets.ts

**Notes.** lead: laws-effects. Filed Oct 28 by the laws-and-effects lead.
