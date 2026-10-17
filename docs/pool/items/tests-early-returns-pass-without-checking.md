---
id: tests-early-returns-pass-without-checking
title: "76 core tests end with a bare return when the drawn place lacks the case, so they pass without checking"
area: core
kind: cleanup
priority: 3
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 
---

**What.** `grep -rnE "^\s+if \(.*\) return;\s*(//.*)?$" src/core2 src/bench src/director src/rules --include=*.test.ts` lists 76 lines (Oct 17) where a test ends early with a bare `return` when the drawn place lacks the case it checks (for example `campaign-turn.test.ts:243` "a town where no one the campaign reached would give has nothing to read", `law-reach-group-b.test.ts:1046`, `residents.test.ts:238`, `legislature.test.ts:275`). A test that returns before any assertion passes without checking anything, which the merger's morning check refuses for a test a change adds. Turn each into a draw loop that tries further places and throws by name when none has the case (as `housing-laws.test.ts` and `home-sale.test.ts` do after Oct 17), or, where the case is genuinely impossible in that place by its data, assert that reason.

**Rules.** A test reaches an applicable case or fails clearly; it never passes empty. One rule, all 56 places: the draw is from all 56 and names place and seed.

**Done when.** The grep above finds only returns that follow an assertion, and every test file touched passes on two random seeds.

**Files.** The test files the grep lists.

**Notes.** Split by file in the order the grep prints; each PR takes a handful. Found while removing the three `context.skip` calls (housing-laws, home-sale and the legislature bribe test).
