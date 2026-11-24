---
id: web-reach-health
title: "Every health link in the outcome web reaches a person's records or names why not"
area: core
kind: wiring
priority: 1
size: M
status: done
claimed-by: claude/web-reach-health-coverage
pr: #6006
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
claimed-at: 2026-10-25T23:52:14.042Z
---

**What.** The outcome web holds 221 researched links; after the merged engine families about 109 reach an engine's records and 112 do not, each listed with its reason and stopgap in `src/core2/data/outcome-web/unwired.json` (written by `scripts/outcome-web/write-unwired.ts`; on the capstone branch until it merges). This item is the health family: 20 unwired links, 9 where the owning engine does not read the factor and 11 where nothing keeps the outcome. Their outcomes: health.mortality-all, health.low-birthweight, health.premature-births, health.depression, health.blood-pressure, health.stroke-and-heart-deaths, health.heat-deaths, health.uninsured-pct, health.catastrophic-medical-bills, health.hospital-visits and the rest. Make the engine that owns each outcome multiply its own rates by the link's effect per person, so real records move, or give the link one specific reason it cannot.

**Rules.** An effect is a read, not a record: a link counts only when the owning engine reads the factor at the moment it decides or pays. One model, two tiers: full and counted people take the same factor by the same rule, with researched moderators. Research before building: size, lag and spread come from the link's citation, never a tuned guess.

**Done when.** `src/core2/outcome-web-twins.test.ts` in a drawn place (seed named) shows each link in this family moving a record kind outside the web's own tables after its lag, and `scripts/outcome-web/effect-matrix.ts` on a played year of `buildBenchWorld` grades it as reaching, with one record id per link in the PR body; any link that stays unwired keeps a specific stopgap row in the unwired list. **On screen.** Nothing yet: it would show on News, and nothing there reads it.

**Files.** src/core2/modules/health.ts, src/core2/death-causes.ts, src/core2/outcome-web-reach.ts

**Notes.** Split Oct 24 by the CTO from the effect-web audit (order `docs/work-orders/lead-effects-2026-10-24.md`). Counts from the capstone branch's unwired list on Oct 23 (effect-web-integration). Coverage reads are `web-coverage-reads` (in review, conflicting); land it inside this family. A PR names this item on line 1 and `Lead: effects` in its body.

Sent back 2026-10-25 from PR #6006 (branch claude/web-reach-health-played): Done-when evidence counts three coverage reads on still-open #5661, while this test checks only web values and those links have no specific unwired rows; land/prove the consumer or accurately register the remaining links, or route the bounded lag fix separately while health-family stays open; finish on that branch, merge main into it first.

Effects lead, Oct 25: #6006 now carries only `web-lag-law-before-opening-reads-none` (line 1), as Merger 2 offered. Its played test's records for the seven running links into death outcomes stay this family's evidence (death engine look, named full people, counted month, by record id). What remains here: the three links into the uninsured share reach once the coverage review reads the web's factor (`web-coverage-reads`, #5661), and the Medicaid expansion and the work requirement each need a played coverage record, on branch `claude/web-reach-health-coverage` after #5661 merges. Sixteen waiting links have their rows on main (#5980); the two the web does not run are graded by `web-matrix-unrun-links-not-reaching` (#6008).

Oct 29 (CTO): set done; PR #6006 merged (the done flip failed while branch protection refused the flip job's push).
