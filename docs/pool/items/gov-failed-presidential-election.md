---
id: gov-failed-presidential-election
title: "A presidential election that elects no one: the contingent election"
area: gov
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/gov-failed-presidential-election
pr: #4505
blocked-on:
milestone:
source: "split from gov-empty-race-holdover"
claimed-at: 2026-10-15T22:55:30.814Z
---

**What.** In `src/core2/modules/world-races.ts` the presidency is won in the electoral college. When no ticket reaches a majority, for example a tie or a third candidate holding the balance, the Twelfth Amendment's contingent election applies: the House chooses the president by state delegation and the Senate chooses the vice president. Build it from the law as data and have the chambers' own members decide, recorded like any other result. The player would notice a split election going to Congress, with each delegation's vote and the reasons for it.

**Rules.** No dice: members' traits, party, relationships and the law decide each delegation's vote; no tiebreak roll; Research before building: cite the amendment and the rule in data; real elections only check that it is rare; Ask why: each delegation's vote keeps its reasons by record id; Replace, never layer: no stand-in tiebreak is left beside the contingent election; One rule, all 56 places: the delegation rule reads data, and it covers the territories' non-voting status without naming one; Sliding scales and causes: no threshold flips the election; the electoral vote counts decide, and the contingent rule runs only when no majority exists.

**Done when.** A test in `src/core2/world-races.test.ts` forces an electoral-college split and resolves it through the chambers with a recorded vote per delegation and a Senate vote for vice president; In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body) never fires it unless the vote actually split (name the seed and the year). The owner plays it: sees a split election go to Congress in a forced scenario and reads the delegation votes.

**Files.** src/core2/modules/world-races.ts, src/core2/modules/legislature.ts, src/core2/data/legislature/

**Notes.** Lower priority than the holdover work: the played golden path has not produced a split.
