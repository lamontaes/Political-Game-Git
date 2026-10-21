---
id: core-census-uncap-opening
title: "Remove the 10,000 cap and prove the speed guard in the largest towns"
area: core
kind: feature
priority: 1
size: S
status: dropped
claimed-by: claude/uncap
pr: #5295
blocked-on: core-census-weight-readers
milestone:
source: "split of core-town-size-census (L): owner ruling core-od-town-size, OWNER-DECISIONS.md"
claimed-at: 2026-10-19T23:36:40.899Z
---

**What.** Once the weight is read everywhere, delete the `Math.min(target, real)` cap and the sample-only path so every town opens at its Census size, and measure a year in the largest town and in a random town, one process at a time.

**Rules.** One model, two tiers (a counted group is read by every engine with the same rule as a full person, times its count); no dice; one rule, all 56 places; an effect is a read; speed (a year under two minutes, no more than 20% slower than base); replace, never layer.

**Done when.** A town above 10,000 opens at its Census count; the largest town's year runs under two minutes and no town runs more than 20% slower than base, measured on the same machine. The old cap code and its stopgap row are deleted (replace, never layer).

**Files.** src/core2/population.ts, src/core2/data/parameters.json

**Notes.** Found by the session that claimed core-town-size-census: the cap is `Math.min(target, real)` in `buildPopulation` (`src/core2/population.ts`, about line 507) with `targetPopulation` = 10,000 in `src/core2/data/parameters.json`. A town is generated one household and one person record at a time (about 12 s and 1.4 GB for 10,000), and counted groups keep one index per household (`src/core2/counted-groups.ts`), so a city of millions cannot open by raising the target. The design the ruling points at: each counted household record carries a weight (how many real households it stands for) and every reader multiplies by it.

Measured Oct 17 (claude session), with PR 4862 (unplaced workers' pay and the groups' savings follow the town's weight) applied: Washington, D.C. (reference population 693,645) opened with `countScale` 69 (the Census count over the 10,000-person sample; `buildBenchWorld("big1", "2025-01-20", { twoLevel: true, placeKey: <D.C.>, countScale: 69 })`) holds 723,466 counted people and 1,586 full ones, opens in 48 seconds and plays a whole year in 167 seconds on this 4-core container (about 2.5 times slower than the Mac, so near 70 seconds there), with the journal balanced and 268 fill-ins. Sixty days at scale 69 take 31.7 seconds against 34.4 at scale one, so the weight itself costs no speed. Without PR 4862 the same town drained its group funds in weeks (they held $15 million against $739 million of weighted opening cash after 40 days), tripled its counted seekers and fill-ins, and ran 40 percent slower because the extra fill-ins each rescan every flow. What is left before the cap goes: counted wages and the seekers still run about three times a small town's per person until the hiring item (PR 4784) lands; the businesses are still the sample's (`world-census-weight-economy`), which is why owner draws, wages and purchases per resident are short (see `world-census-weight-owner-draws`). The uncap itself is then a default: in `src/bench/world.ts`, `countScale` ← the town's reference population over its sampled people when above one, and the same default wherever an opening is built.
