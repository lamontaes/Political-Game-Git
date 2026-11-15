---
id: tests-law-reach-barred-county-act-leaves-the-budget-line-untouched
title: "No test shows that a county or city act on a question the state bars leaves the budget line untouched"
area: laws
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "asked for by the Account lead on the group B test fix, Nov 14"
claimed-at:
after:
lead: account-lead
model: sonnet
effort: medium
root: rc2-done-from-records
checked: sonnet 2026-11-14
---

**What.** Where the state bars its places from a question (`localPowerBarred`), a county or city act on it is void and only the state makes the rule. The player sees a bill's warning, "State law overrides this", at draft time, but no test proves that an act forced through anyway changes nothing: `authority-words.test.ts` covers only the wording. The group B pension, reserve and balanced-budget cases used to enact such an act and failed, and now act at the level the state allows, so nothing in that file shows the void act reaches nobody. Seen: a pension case that enacted a county act at a barred place left the retirement contributions line at its start.

**Cause.** Found in code: `src/core2/law-reach-group-b.test.ts` before the group B test fix enacted the county act with `enactLaw`, bypassing the bill path, and the engine correctly gave it no reach; the same case now uses `actLevel`. No other test names the void-act outcome.

**Fix.** Design: add one pinned test next to the group B cases, at a named place and seed where `localPowerBarred` is true for a fiscal question, that enacts the county act, reads the county's budget line before and after, and asserts it is unchanged and that no `limit` or applied row was written; then enacts the same rule at the state and asserts the line moves.

**Time box.** 1 hour for one Sonnet session at medium effort. When it runs out, write what was seen in the item and stop.

**Rules.** One rule, all 56 places: the test is pinned to one named place and seed and the item names them; pinned tests: no draw loop, about a minute, explicit timeout.

**Done when.** A second session, not the builder, runs `npx vitest run src/core2/law-reach-group-b.test.ts` on main in a drawn place and seed it names and sees the new case pass, and sees it fail when the barred-act check in the engine is removed in a scratch copy.

**Waits on.** The group B test fix folding.

**Files.** src/core2/law-reach-group-b.test.ts

**Notes.** Found while fixing tests-law-reach-group-b-pension-reserve-and-balanced-budget-cases.
