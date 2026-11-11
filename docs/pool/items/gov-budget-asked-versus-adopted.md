---
id: gov-budget-asked-versus-adopted
title: "Asked versus adopted: keep what each department asked for beside what the budget adopted"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: governing
standard: 2
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-gov-budget-asked-versus-adopted
---

**What.** The approved Budgets screen shows each line with "Asked" and "Last year" on one small line. Last year comes from the prior budget, which the game keeps. What a department asked for is computed (`departmentRequests` in the budgets module) but not kept beside the adopted line, so the screen's "Asked" is a figure derived from the line before the bill, not the recorded request. Keep the request and the adopted figure together per line and per fiscal year, and who wrote the adopted budget, so the screen can answer "since last year" (the Nov 8 budget screen ruling) from a record. Seen: the Budgets screen's Asked and Last year figures beside each adopted line.

**Cause.** Found in code: `src/core2/modules/budgets.ts` `departmentRequests` (line 1460) computes the request; `src/bench/budget.ts` `totaled` takes an optional `askedMinor` callback (line 151) that is fed from `lineBeforeBill` (line 265), not from a kept request.

**Fix.** Record each line's request next to the adopted figure when the budget is written, per line and fiscal year, with the adopted budget's author, and have the Budgets screen read it for "Asked", showing "Last year" only where no request was kept.

**Time box.** 5 hours for one sonnet session.

**Rules.** No placeholder numbers: the requested figure is the department-request computation's own output, recorded when the budget is written. One budget engine. An effect is a read, not a record: the Budgets screen reads the kept figure. Speed and memory: old years fold into summaries once nothing reads them.

**Done when.** A second session plays a year in a drawn place (named with its seed), opens the Budgets screen, and sees "Asked" beside "Last year" for each line of a budget written in that run, each Asked equal to the request recorded for that line by record id; a line with no recorded request shows "Last year" only.

**Waits on.** Nothing.

**Files.** src/core2/modules/budgets.ts, src/bench/budget.ts, src/bench/play.mjs

**Notes.** TODO

Released (2026-11-11): Read and scoped, not built: BudgetRow (budgets.ts line 164) has no request field and budgets are written on four paths (council vote, executive proposal, budget bill, rule/outside-budgets), while departmentRequests (line 1460) returns the lines as last enacted, which is lineBeforeBill's value again, so a kept 'asked' only differs from today's screen figure where the body amends the request. The request has to be captured at the budget bill's introduction (legislature.ts line ~916) and carried to the adopted row, then read by src/bench/budget.ts totaled; a design call about what counts as asked before it is a one-session build. Continue on branch claude/pool-gov-budget-asked-versus-adopted.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:24 UTC) on branch claude/pool-gov-budget-asked-versus-adopted.

Released (2026-11-11): Held by my own next loop while walking the queue; not worked (see the item's own size and Fix: M-sized or needs Story/Words lines, not started this pass). Continue on branch claude/pool-gov-budget-asked-versus-adopted.
