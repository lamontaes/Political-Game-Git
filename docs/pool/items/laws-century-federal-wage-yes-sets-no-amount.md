---
id: laws-century-federal-wage-yes-sets-no-amount
title: "A century world where Congress already said yes to raising the federal minimum wage opens with the wage still at $7.25, so the law in force does nothing"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
standard: 2
model: sonnet
effort: medium
lead: laws
root: design-one-model-two-tiers
source: Laws and effects, Nov 18, congress-wage-question on #10135 at Belmont, New Hampshire (replay 5ff729f3b78f823e); CTO question on #10195 (6994427406)
claimed-at:
after:
checked:
---

**What.** In a world whose day one is the century's, the federal question `us-federal-positions:labor-commerce.raise-federal-minimum-wage` can open standing at yes. At Belmont, New Hampshire, replay 5ff729f3b78f823e, `lawInForce(api, "us-federal-positions:labor-commerce.raise-federal-minimum-wage")` shows the federal row `law:US:federal:us-federal-positions:labor-commerce.raise-federal-minimum-wage:general:starting` at value 1, and `yesLevels` lists the federal level. The federal minimum wage in force is still `law:US:federal:minimum-wage:general:2009-07-24` at 725 (cents an hour). A raise in force carries no amount. A bill that enacts the same yes later restates what is in force, so the wage never moves either.

Seen: dev mode's law view for the federal level, and the jobs engine's wage floor for any worker (it reads 725).

**Cause.** Found in code: two functions that each assume the other has done the work.
- `src/core2/modules/laws.ts`, the century branch of the opening laws (around line 244): for a federal question, `centuryLaw(seed, "US", question)` returns the century's last enactment, and the row is written as `...:general:starting` with `value: enacted?.value`, `terms.centuryRecordId` set, and no wage amount. The research row for this question is `answer: no` with a floor of 725 (`data/research/laws/starting-law-2026/labor-commerce.json`: "The question asks whether to raise the federal floor, so no preserves its existing sourced amount").
- `src/core2/question-wages.ts`, `holdFederalWage`: `if (standing && change.lawId.endsWith(":starting")) return;`, with the comment "The opening's researched answer is the federal floor already in force". That holds for a researched answer, where yes means the floor is already the amount. It is false for a century row with `terms.centuryRecordId`: Congress passed a raise in session `enacted.year`, and nothing writes the amount.

**Fix.** In `holdFederalWage` (`src/core2/question-wages.ts`), treat a `:starting` row that carries `terms.centuryRecordId` and has value 1 like an enactment in play: call `setLevelWage` with the same target an in-play bill writes (`reachParameter("federalMinimumWageTargetMinor")`), at the session's own date (the row's `effectiveDate`, not tomorrow), so one engine writes the amount and `restoreWages` can write 725 back on a repeal. A century repeal row already routes to `restoreWages`. Check first whether the century's record (`CenturyLaw` in `src/core2/electorate-century.ts`) carries an amount; if it does, use it, and if it does not, register the target as a stopgap in `src/core2/data/stopgaps/` (the bill's own number is not in the century's session record). Then undo the test's workaround, if `congress-wage-question.test.ts` has one, and keep its assertion that an enactment after a repeal raises the federal floor above `before.value`.

**Time box.** 2 hours.

**Rules.** One engine per mechanic: the wage engine in `question-wages.ts` writes every federal wage change. No dice. Everything comes from the simulation: the amount is the bill's, not a real current figure pinned to the world. One rule, all 56 places.

**Done when.** A second session, in a century world at a drawn place and seed nobody chose where Congress passed the raise before day one, sees the federal minimum wage on day one above 725, with the federal wage row naming the century's session by record id, and a worker under that floor raised. `src/core2/congress-wage-question.test.ts` passes at replay 5ff729f3b78f823e without starting by repealing the rule.

**Waits on.** Nothing.

**Files.** src/core2/question-wages.ts, src/core2/congress-wage-question.test.ts

**Notes.** Laws and effects, Nov 18: the test currently fails at replay 5ff729f3b78f823e on `train/nov17b` ("expected 725 to be greater than 725", line 109); #10195 would have made it start by repealing the rule. The CTO asked (6994427406) whether a yes in force should carry its amount; it should, so #10195 is closed and the test stays red on this item.
