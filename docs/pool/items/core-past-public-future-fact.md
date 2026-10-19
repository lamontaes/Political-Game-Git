---
id: core-past-public-future-fact
title: "A new life fails to open with 'Cannot learn a future fact' when a resident comes of age to follow politics on the opening day (seed 12195dbfc321172d)"
area: core
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/core-past-public-future-fact
pr: #4725
blocked-on:
source: "found by a scan of random seeds while checking gov-succession-vp-foreign-born-red"
claimed-at: 2026-10-16T15:51:41.722Z
---

**What.** `buildBenchWorld("12195dbfc321172d", "2026-10-12", { twoLevel: true })` stopped in `buildPublicFigures` (`src/core2/past-public.ts`): a resident of the age at which people follow politics had the officeholders' names learned one day after the opening, and the knowledge store refuses a fact dated in the future. The cause is counting awareness age in mean years (365.25 days) while the resident's age on the opening day is counted in calendar years, so a resident whose awareness birthday falls on the opening day gets a date a day late. About one seed in a hundred was affected. The fix dates what they learned no later than the opening.

**Rules.** No dice. Ask why: the cause is named by file and line. Replace, never layer: one dating rule for what the public knew.

**Done when.** The named seed opens in the bench world (two-level, October 12, 2026), and a test in src/core2/past-public-opening.test.ts shows that no resident's knowledge of an officeholder is dated after the opening, by person record id. The owner plays it: starts a new life on any seed and the town opens.

**Files.** src/core2/past-public.ts, src/core2/past-public-opening.test.ts

**Notes.** Found by building 150 random seeds in the two-level bench world.

Sent back 2026-10-16 from PR #4725 (branch claude/past-public-future): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks.; finish on that branch, merge main into it first.
