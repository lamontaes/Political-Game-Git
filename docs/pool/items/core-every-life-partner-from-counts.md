---
id: core-every-life-partner-from-counts
title: "A partner met elsewhere comes out of their place's counted people instead of being added on top"
area: core
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-core-every-life-partner-from-counts
pr: #8631
after:
blocked-on:
source: added with npm run pool -- add
lead: lives
standard: 2
model: sonnet
effort: medium
root: design-one-model-two-tiers
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:27:58.501Z
branch: claude/pool-core-every-life-partner-from-counts
---

**What.** When a single adult living elsewhere marries, the partnerships module (src/core2/modules/partnerships.ts, PR #7082) generates the partner as a new full person on top of the population. So the place or state they live in counts one more resident than its data: the counted-moves engine reads them as a resident of a counted place, and a state's coarse counts are not reduced. The speed lead found this through the unit 4 ablation, and under one model, two tiers a filled-in person must match the records already kept.

**Cause.** Found in code: src/core2/modules/partnerships.ts `meetPartner` (line 171) generates a partner living elsewhere as a new full person on top of the population, so counted-moves reads one extra resident and the state's coarse counts are not reduced.

**Fix.** Take the partner from the place's counted single adults of fitting age and sex (a state's coarse age band gives up one person), seeded by the pair, so total population is unchanged by partnerships.

**Time box.** 3 hours for a Sonnet session.

**Rules.** Two-level population: the partner is one of the people the counts already hold where they live, taken out of the counts as they become full. One model, two tiers: a counted place gives a counted single adult of fitting age and sex, and a state's coarse age bands give up one person in the partner's band. No dice: who is taken follows the partner's age and sex from the CPS age gap, seeded by the pair.

**Done when.** A second session, in a generated world of a drawn place (place and seed named), runs a year and sees the counted people of each place or state that a partner came from lower by exactly the partners taken from it, and the total population including full people unchanged by partnerships. src/core2/partnerships.test.ts shows it in three draws.

**Waits on.** Nothing.

**Files.** src/core2/modules/partnerships.ts, src/core2/modules/counted-moves.ts, src/core2/modules/residents.ts, src/core2/partnerships.test.ts

**Notes.** Filed by the lives lead, Nov 1, on the speed lead's point after the unit 4 ablation (PR #7082).

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:47 UTC) on branch claude/pool-core-every-life-partner-from-counts.

Released (2026-11-11): a builder claimed this and did not start it (its draft said so and left the claim in place); Fable B released it so another builder can take it.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:27 UTC) on branch claude/pool-core-every-life-partner-from-counts.
