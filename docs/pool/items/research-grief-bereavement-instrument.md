---
id: research-grief-bereavement-instrument
title: "Research: a bereavement measure and observed behavior after a loss to check the grief line against"
area: people
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10 2026 (docs/stopgaps/triage-2026-11-10/p15.md)
lead: researcher
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** Grief starts at the closeness to the person who died and halves every personal half-life. The half-life spread is solved from two Bonanno and others (2002) pattern shares, with "little grief" set at a quarter of the starting grief (TUNABLE). Grief also pulls toward rest and family contact and holds back organizing, with tunable weights. Find a published bereavement measure and observed behavior after a loss that these can be checked against, and record what is sourced and what stays TUNABLE. Closes SG-P15-grief-line as a marked estimate where no source converts.

**Cause.** Found in code: `src/core2/data/grief.json` line 3 (`stopgapId: SG-P15-grief-line`) and `src/core2/grief.ts`; the weights and the little-grief fraction have no source row. Researched Oct 10 for the two pattern shares only.

**Fix.** Read the bereavement papers (for example Bonanno and others 2002 grief items, the Hogan Grief Reaction items, and time-use or contact changes after widowhood), fetch and quote the pages, and write `data/research/people/bereavement-measure.json` (new) with figures, years, units and spreads. Put a SOURCED or ESTIMATED row with a citation and a spread in `src/core2/data/parameters.json` for each figure that converts to a model unit. Say plainly, in the PR body, which weights have no convertible effect and stay TUNABLE with the reason. Saving losses with the world is not part of this item.

**Time box.** 4 hours for a Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: sourced figures check the town's totals (the share still grieving at 6 and 18 months) and never decide one person's grief. No dice. Estimate, never UNKNOWN. Every number is tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** A second session reads the parameter rows for grief and finds each SOURCED or ESTIMATED with a citation and a spread, or TUNABLE with a stated reason, and in a one-year `buildBenchWorld` in a drawn place (place and seed named in the PR) sees `scripts/research/core-parameters-year.ts` print the share of bereaved residents still grieving at 6 and 18 months beside the source's figures. The marker in `src/core2/data/stopgaps/p15.json` is kept with the reason, or resolved.

**Waits on.** Nothing.

**Files.** src/core2/data/grief.json, src/core2/grief.ts, src/core2/data/parameters.json, scripts/research/core-parameters-year.ts, data/research/people/bereavement-measure.json (new)
