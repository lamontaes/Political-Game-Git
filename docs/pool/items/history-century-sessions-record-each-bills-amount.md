---
id: history-century-sessions-record-each-bills-amount
title: "A century session's enactment records only yes or no, so a passed raise has no amount of its own and the engines borrow the in-play bill's target"
area: history
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
standard: 2
model: opus
effort: medium
lead: history
root: design-one-model-two-tiers
source: CTO, Nov 18 23:44Z on #9747 (6994993074), on #10198 (century federal wage raise)
claimed-at:
after:
checked:
---

**What.** In a world whose day one is the century's, a federal or state question can open as a row the century's session passed (`law:<place>:<level>:<question>:general:starting`, `terms.centuryRecordId` set, `value` 1). The record (`CenturyLaw` in `src/core2/electorate-century.ts`, read by `centuryLaw`) carries the session year, the chamber counts and the value, and no amount. An in-play bill carries its own number. So a passed raise has no amount of its own: the federal minimum wage raise (`us-federal-positions:labor-commerce.raise-federal-minimum-wage`) borrows `reachParameter("federalMinimumWageTargetMinor")` (the Raise the Wage Act of 2023's $17.00) in `holdFederalWage` (`src/core2/question-wages.ts`), whatever year the century's Congress passed it.

Seen: dev mode's law view for the federal level in a century world where Congress passed the raise, and the wage in force.

**Cause.** Found in code: `centuryLaw` returns a `CenturyLaw` with `year`, `chambers`, `value`, `overridden` and `id` only; the opening laws branch in `src/core2/modules/laws.ts` (around line 244) writes the row from them and no amount. Whoever applies an amount-bearing question (`holdFederalWage`, `holdRaisedWage` in `question-wages.ts`) has nothing to read, so it uses a fixed target.

**Fix.** Where a century session passes a question that sets an amount, the session's record carries the amount, drawn the way an in-play bill's number is chosen (by the bill-drafting path that gives an in-play bill its amount, from the law's own drivers, not a pinned real figure), and the opening row stores it in `terms`. The wage engine then reads `terms` for a row with `centuryRecordId` and falls back to the parameter only for a question the century does not vote on. When this lands, the stopgap that names the borrowed target is removed.

**Time box.** 4 hours.

**Rules.** One engine per mechanic: the bill-drafting path decides amounts, the century only runs it. Everything comes from the simulation: no real current figure pins the amount. No dice. One rule, all 56 places.

**Done when.** A second session, in a century world at a drawn place and seed nobody chose where Congress passed the raise before day one, sees the federal minimum wage on day one equal to the amount on the century session's own record, not the in-play target, with the wage row naming that record by id.

**Waits on.** Nothing.

**Files.** src/core2/electorate-century.ts, src/core2/modules/laws.ts, src/core2/question-wages.ts

**Notes.** Laws and effects, Nov 18: #10198 writes a century yes's wage through `setLevelWage` with the in-play target, on the opening day, as the CTO ruled (6994993074): "using the in-play bill's target, because the century's session record carries none, is fine for now."
