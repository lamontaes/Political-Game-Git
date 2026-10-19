---
id: core-census-weight-readers
title: "The other readers of a counted person count read the household weight"
area: core
kind: feature
priority: 1
size: M
status: done
claimed-by:
pr: #4456
blocked-on: core-census-weight-model
milestone:
source: "split of core-town-size-census (L); left over from core-census-weight-model"
---

**What.** Households carry a weight (`CountedHousehold.weight`, read through `CountedStore.weightOf`, `weightedCount` and `weightedPeople`), and `reachOf` and a fill-in already read it. Make the remaining people-count readers read it too: the monthly pull and move totals (`src/core2/modules/counted-moves.ts`: place people at lines near 287, 388, 433, 654 and 707, and the household that moves, so a move carries its weight in people and a newcomer arrives at the destination's weight), the foreclosure and homeless counts (`housing-foreclosure.ts`, `housing-homeless.ts`), credit deposit groups (`credit-deposits.ts`), the law reach residents (`law-reach/group-b-people.ts`, one row stands for a weight of residents), the residents totals (`modules/residents.ts`, around lines 449 and 462), and the meetings roll (`modules/meetings.ts`).

**Rules.** One model, two tiers; no dice; speed (no more than 20% slower than base); replace, never layer.

**Done when.** In a played-world year of a drawn town opened with a count scale above one (`buildBenchWorld(..., { countScale })`), each reader above returns the same figure as the unscaled town times the scale, named by record id, and a town at scale one gives numbers identical to base. A test in a random place proves it. The owner plays it: nothing yet; this is the base for the Census-size opening.

**Files.** src/core2/modules/counted-moves.ts, src/core2/housing-foreclosure.ts, src/core2/housing-homeless.ts, src/core2/credit-deposits.ts, src/core2/law-reach/group-b-people.ts, src/core2/modules/residents.ts, src/core2/modules/meetings.ts

**Notes.** Found by the session that built core-census-weight-model (PR for that item). The electorate rows (`src/core2/electorate.ts`) belong to elections-census-weight-electorate.

Session handed off Oct 15, 2026: PR #4456 (claude/core-census-weight-readers, stacked on #4436) holds the people-count readers; pool/core-census-weight-readers has an extra WIP commit (df8eb8f: credit-deposits, housing-homeless, law-reach group-b money/people, a new test, a new item core-census-weight-arrears-readers) not in the PR; remainder: reconcile that commit with the PR or drop it, the money readers go to core-census-weight-money.
