---
id: legislature-percent-a-year-in-the-engine
title: "Only the player's bill can raise an amount by a percent a year; the world's own legislators cannot"
area: gov
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: play-draft-phase-in-percent-a-year
blocked-on:
lead: laws
source: Acting CTO's read of the frozen Train 892427ec (fault 2, /mnt/project-files/account-lead/train/other-account-comments-9052.md); ruled by the account lead Nov 15, 2026
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** A player who sits in a body can draft a law amount that rises by a percent a year (the owner's ruling, Sept 12: dated steps or a percent a year). The engine holds the dated steps such a bill becomes, but the step that turns a percent, its years and its first day into those steps lives in the bench (`draftBill` input `risePerYear` in src/bench/legislature.ts). So a legislator the world plays never writes one, and a raise indexed by a percent (a minimum wage rising 5% a year) appears only when the player drafts it. Seen: the bill paper of a bill the world's own legislature drafts, under a body's bills in Issues.

**Cause.** Found in code: `risePerYear` and the loop that makes one step a year are in src/bench/legislature.ts (lines about 370 to 440 at the Train's 892427ec); `provisionFor` in src/core2/bill-catalog.ts and src/core2/modules/world-legislating.ts take only a value or dated steps.

**Fix.** Move the percent-a-year step maker into src/core2/bill-catalog.ts (one function that gives dated steps from an amount in force, a percent, years and a first day), have the bench's draft call it, and let `world-legislating` draft a raise as a percent a year where its sponsor's drafting picks an indexed raise. One rule for both, deleted from the bench. The player sees it on the bill paper of the world's bills.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** One engine per mechanic: the bench shapes the player's input and the engine makes the steps. No dice: a sponsor drafts an indexed raise from what it stands for, never a roll.

**Done when.** A second session plays a drawn place a year and finds, in dev mode's bill list or a body's bills in Issues, a bill the world drafted whose sections rise by a percent each year, and the player's percent-a-year bill still drafts the same sections as before.

**Waits on.** Nothing.

**Files.** src/core2/bill-catalog.ts, src/bench/legislature.ts, src/core2/modules/world-legislating.ts
