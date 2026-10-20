---
id: tests-early-returns-pass-without-checking
title: "76 core tests end with a bare return when the drawn place lacks the case, so they pass without checking"
area: core
kind: cleanup
priority: 3
size: L
status: done
claimed-by:
pr: #4931
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** `grep -rnE "^\s+if \(.*\) return;\s*(//.*)?$" src/core2 src/bench src/director src/rules --include=*.test.ts` lists 76 lines (Oct 17) where a test ends early with a bare `return` when the drawn place lacks the case it checks (for example `campaign-turn.test.ts:243` "a town where no one the campaign reached would give has nothing to read", `law-reach-group-b.test.ts:1046`, `residents.test.ts:238`, `legislature.test.ts:275`). A test that returns before any assertion passes without checking anything, which the merger's morning check refuses for a test a change adds. Turn each into a draw loop that tries further places and throws by name when none has the case (as `housing-laws.test.ts` and `home-sale.test.ts` do after Oct 17), or, where the case is genuinely impossible in that place by its data, assert that reason.

**Rules.** A test reaches an applicable case or fails clearly; it never passes empty. One rule, all 56 places: the draw is from all 56 and names place and seed.

**Done when.** The grep above finds only returns that follow an assertion, and every test file touched passes on two random seeds.

**Files.** The test files the grep lists.

**Notes.** Split by file in the order the grep prints; each PR takes a handful. Found while removing the three `context.skip` calls (housing-laws, home-sale and the legislature bribe test).

**Progress (Oct 17, claude).** Fixed in PRs 4925 (campaign-turn), 4928 (residents), 4931 (legislature), 4932 (office desk, office hours, House leadership, campaign ads, state item veto, public schools), 4933 (party filing, party chair, ballot order, child access) and 4934 (terms and vacancies, officials), with a shared draw helper `worldWith` in `src/core2/tooling/world-with.ts` (PR 4932). Still returning early: `news.test.ts:107` (module-level fixture without a county), `school.test.ts:59`, `schools-by-era.test.ts:108`, `market-entry.test.ts:110`, `jobs-player-offers.test.ts:57`, `property-tax-laws.test.ts:89`, `office-proof.test.ts:84`, `office-day-state.test.ts:115`, `office-day-federal.test.ts` (4 sites that return from callbacks), `law-reach-group-a.test.ts:480`, `law-reach-group-b.test.ts:1046`, `journal-state.test.ts:568,1731`, `finance-plan.test.ts:317`, `jobs.test.ts:906,1058`, `cannabis-sales-law.test.ts:133` (already a draw loop) and a few callbacks that return legitimately. Those tests share one module-level world per file, so each needs its place chosen with the case in hand (`worldWith`) rather than a guard inside the test.

Sent back 2026-10-18 from PR #4925 (branch claude/tests-early-returns-campaign-s5): The changed campaign-turn test fails because the first generated world has no eligible candidate pair: Colony, Oklahoma (4016400), run seed f0baccc51273a642f299b70853822f02f82c74c3ca79c967b39805d1a3cd5b2f, place seed 3760b3079d421485176738befcae0d78f9f3640b6d2d38ea061dcdb3770d32f3. It fails at the new pair-not-null assertion before checking campaign money; clean captured main passes. Draw a bounded eligible world for every required positive case, fail on exhaustion and retain all money/views/question assertions. Reconcile the overlapping redraw repair in #5002 on this branch.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #4925 (branch claude/tests-early-returns-campaign-s5): Merge main 2cc203cf7c22 into claude/tests-early-returns-campaign-s5 conflicts in: src/core2/campaign-turn.test.ts. Resolve these files with a normal merge before changed-file validation; no integrated green head exists.; finish on that branch, merge main into it first. Current replacement claim and PR are preserved.
