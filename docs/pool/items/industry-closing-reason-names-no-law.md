---
id: industry-closing-reason-names-no-law
title: "A business that closes or loses money never says which law or cost did it, so no line can name the cause"
area: words
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: words
model: opus
effort: medium
source: "Industries thread, Nov 16 (trace /mnt/project-files/account-lead/reports/industry-events-read-by-story.md), at the Account lead's direction, for the owner's Nov 16 01:58Z ask"
---

**What.** When a law's charge (a payroll tax, a compliance duty, a premises tax) tips a business's month into a loss and enough loss months close it, the closing's reason is only `losses-kept`. The paper, the layoff scene and the owner's talk cannot say what put it under, so a law's effect on a business never reaches the story. Seen: Thief River Falls, Minnesota (2764570), seed ind-2764570, a played year on #9627's head: a trucking firm (organization_d202a2e30d17a19d) closed on 2025-09-01 with reason `losses-kept` and nothing naming a cause.

**Cause.** Found in code: the closing reason is set from `closingReasonKey` in src/core2/finance-state.ts (around line 1826), and the business module's `closures` row (src/core2/modules/business.ts, `onEvent` for `organization.closed`) copies only that key; the trading row's law charges (`charges` with `lawIds`, from #9629) are never summed into the closing record or the `business.closed` event's facts.

**Fix.** In the business module's `onEvent` for `organization.closed`, read the closed business's last trading rows and add to the `closures` row and the `business.closed` event's facts the largest cost that grew over its loss months and, where it is a law charge, its law id. printed-words.ts and the layoff scene read that fact. The player sees it on the paper's closing story and in dev mode's Industries page (a month's Law duties and Records).

**Time box.** 4 hours; if not done, push what exists, open the draft PR and write the handoff in Notes.

**Rules.** An effect is a read, not a record: the law's charge is a cause only when the closing record and its story read it. Ask why: the line names the cause by record id, never a guess.

**Done when.** In a drawn place where a law charge in force grows a business's costs until it closes, the closing story and the layoff scene name that law, by its law id, and a second session sees it in the running game.

**Waits on.** #9629 (the trading row's charges) folding.

**Files.** src/core2/modules/business.ts, src/bench/printed-words.ts
