---
id: laws-starting-rows-next-year-override-play
title: "A rate a body changes in play reverts on January 1, when the starting law's next-year row takes effect"
area: laws
lead: laws
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: claude/law-in-play-beats-starting
pr: #6177
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T18:59:55.733Z
---

**What.** The starting law carries next-year rows (effective January 1, 2026) for the income, corporate and property taxes, the minimum wage and other amount laws. When a body in play changes one of those rates in 2025, the starting law's 2026 row takes effect on January 1 and replaces the body's rate, because the law in force is the latest row by effective date. So a tax the player's legislature raises reverts after about eleven months. Measured by the laws lead in the taxes family's year runs (Oct 25, branch claude/law-wiring-taxes): in Prescott, Michigan (seed a91c03e7d2b84f10), the checker's 4.68% state income tax gave way to `law:US-MI:state:income-tax:general:2026-01-01` (4.25%) on January 1, 2026, and the corporate and property tax runs did the same (`inPlay` in `docs/reports/law-wiring/families/taxes-year-US-*.json`). The labor family saw the scheduled 2026 and 2027 minimum wages take effect in every run. A later enactment governs an earlier one: a row enacted in play should prevail over a starting row enacted before the game opened, whatever their effective dates. A scheduled change the body did not touch still takes effect.

**Rules.** One rule, all 56 places. Replace, never layer: the precedence rule changes in the law-in-force answer, not in each engine. No dice.

**Done when.** In a played world (`buildBenchWorld`, a drawn place and seed named), a state income tax rate a legislature changes in 2025 is still in force on February 1, 2026, named by law id. A scheduled 2026 row for a series nobody changed still takes effect on January 1, 2026. The taxes and labor family tests pass. **On screen.** Nothing yet: it would show on Politics → Budgets, and nothing there reads it.

**Files.** src/core2/laws-in-force.ts, src/core2/modules/laws.ts

**Notes.** Laws lead, Oct 25, from PR #5649.
