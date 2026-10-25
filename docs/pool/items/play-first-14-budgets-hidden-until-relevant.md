---
id: play-first-14-budgets-hidden-until-relevant
title: "Budgets stays out of Politics until you hold office, file, or can vote"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #6097
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** The owner's read of the playtest screenshots: no budgets for a 17-year-old. The v0.22.10 Politics tab showed the United States budget to the cent ("$5,234,616,386,315.43") on the first evening. This item hides Budgets until it is relevant to the player: they hold office, have filed, or are of age to vote (owner, Oct 24), and rounds the amounts the way a reader says them.

**Rules.** Serves LAW.md §1, Screens and menus; LAW.md §10, The owner's read of the Oct 24 screenshots. This is a game, not a spreadsheet: a tab appears when the player can use it, as Your office and Campaigns already do. American English everywhere: large amounts read as "$5.2 trillion", never to the cent.

**Done when.** In a drawn place, a new life at 17 shows no Budgets tab under Politics; once the player holds office, files, or is of age to vote the tab appears with amounts rounded to a readable unit, shown by a screenshot before and after filing.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** At 17 with no office and no filing, Politics has no Budgets tab; it appears once you hold office, file, or come of age to vote, with amounts in rounded words.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.mjs, src/bench/government.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Ruled (owner, Oct 24, "go ahead"; newest wins): hidden until relevant, meaning the player holds office, has filed, or is of age to vote; the Oct 20 "always shown" line is superseded (OWNER-DECISIONS.md, Oct 24; LAW.md conflicts). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).

Sent back 2026-10-25 from PR #6097 (branch play-first/play-first-14-budgets-hidden-until-relevant): roundedDollars keeps fractional dollars below $1,000:1234minor renders $12.3 and123minor $1.23, failing its own browser whole-dollar contract; finish on that branch, merge main into it first.
