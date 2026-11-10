---
id: core-census-uncap-opening
title: "Remove the 10,000 cap and prove the speed guard in the largest towns"
area: core
kind: feature
priority: 1
size: S
status: blocked
claimed-by:
pr: #5295
after:
blocked-on: core-speed-year-over-limit-dense-town
milestone:
source: "split of core-town-size-census (L): owner ruling core-od-town-size, OWNER-DECISIONS.md"
claimed-at: 2026-10-23T21:30:20.833Z
lead: speed
standard: 2
model: opus
effort: high
root: design-one-model-two-tiers
---

**What.** Once the weight is read everywhere, delete the `Math.min(target, real)` cap and the sample-only path so every town opens at its Census size, and measure a year in the largest town and in a random town, one process at a time. The cap is in `buildPopulation` (src/core2/population.ts, line 575) with `targetPopulation` set to 10,000 in src/core2/data/parameters.json. A town is generated one household and one person record at a time, so a city of millions cannot open by raising the target; each counted household record carries a weight and every reader multiplies by it.

**Cause.** Found in code: src/core2/population.ts line 575 caps the sample with `Math.min(target, real)`, and `targetPopulation` is 10,000 in src/core2/data/parameters.json (line 216). Measured Oct 17 (in this item's Notes): Washington, D.C., opened at 69 times scale through counted-household weights, plays a year in 167 seconds on a 4-core container.

**Fix.** Open every town at its Census size through counted-household weights. Delete the cap, the sample-only path and the stopgap row for them. Then measure a year in the largest town and in a random town, one process at a time.

**Time box.** 6 hours for an Opus session.

**Rules.** One model, two tiers (a counted group is read by every engine with the same rule as a full person, times its count). No dice. One rule, all 56 places. An effect is a read, not a record. Speed: a year under two minutes, no more than 20% slower than base. Replace, never layer: the old cap code and its stopgap row are deleted, not left beside the new path.

**Done when.** A second session, in a drawn town above 10,000 people (place and seed named), sees it open at its Census count in the played world, and sees the largest town's year run under two minutes on `npm run speed:year`, with no town more than 20% slower than its base on the same machine. A search of src/core2 finds no `Math.min(target, real)` cap and no stopgap row for it.

**Waits on.** Nothing (core-speed-year-over-limit-dense-town, named in blocked-on, is done); check core-opening-counts-from-census and world-census-weight-owner-draws first.

**Files.** src/core2/population.ts, src/core2/data/parameters.json, src/bench/world.ts

**Notes.** Found by the session that claimed core-town-size-census: the cap is `Math.min(target, real)` in `buildPopulation` (`src/core2/population.ts`, about line 507) with `targetPopulation` = 10,000 in `src/core2/data/parameters.json`. A town is generated one household and one person record at a time (about 12 s and 1.4 GB for 10,000), and counted groups keep one index per household (`src/core2/counted-groups.ts`), so a city of millions cannot open by raising the target. The design the ruling points at: each counted household record carries a weight (how many real households it stands for) and every reader multiplies by it.

Measured Oct 17 (claude session), with PR 4862 (unplaced workers' pay and the groups' savings follow the town's weight) applied: Washington, D.C. (reference population 693,645) opened with `countScale` 69 (the Census count over the 10,000-person sample; `buildBenchWorld("big1", "2025-01-20", { twoLevel: true, placeKey: <D.C.>, countScale: 69 })`) holds 723,466 counted people and 1,586 full ones, opens in 48 seconds and plays a whole year in 167 seconds on this 4-core container (about 2.5 times slower than the Mac, so near 70 seconds there), with the journal balanced and 268 fill-ins. Sixty days at scale 69 take 31.7 seconds against 34.4 at scale one, so the weight itself costs no speed. Without PR 4862 the same town drained its group funds in weeks (they held $15 million against $739 million of weighted opening cash after 40 days), tripled its counted seekers and fill-ins, and ran 40 percent slower because the extra fill-ins each rescan every flow. What is left before the cap goes: counted wages and the seekers still run about three times a small town's per person until the hiring item (PR 4784) lands; the businesses are still the sample's (`world-census-weight-economy`), which is why owner draws, wages and purchases per resident are short (see `world-census-weight-owner-draws`). The uncap itself is then a default: in `src/bench/world.ts`, `countScale` ← the town's reference population over its sampled people when above one, and the same default wherever an opening is built.

Sent back 2026-10-23 from PR #5295 (branch claude/uncap): Normal main integration conflicts in src/bench/world.ts; resolve the code conflict and rerun changed-file checks and the named large-town proof; finish on that branch, merge main into it first.

Oct 23 (claude/sleepy-carson-f8omzd, after the PR 5295 send-back): the conflict is resolved and the opening at Census scale is split out as core-census-opens-at-census-scale, which PR 5295 now carries. Measured on the 4-core container, one process at a time: Washington, D.C. models 688,313 of its 693,645 (clean main 10,000) and plays its year in 176.6 s against main's 213.6 s; New York, the largest town, plays its year in 371.7 s against main's 335.2 s (10.9 percent slower). The two-minute line cannot be met by that PR while main's own New York year is 335.2 s, so this item waits on core-speed-year-over-limit-dense-town. The cap line is not met as written: `Math.min(target, real)` now sets the sample size, and the town reaches its Census size through the counted households' weight; the CTO decides whether that closes it.

Oct 25 audit: From the dropped core-town-size-census: it also waited on world-census-weight-owner-draws; check that item before closing.
