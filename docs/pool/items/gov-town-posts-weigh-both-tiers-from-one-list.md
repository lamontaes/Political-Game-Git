---
id: gov-town-posts-weigh-both-tiers-from-one-list
title: "A town post weighs every full adult but only three counted ones, so the player's household still heads a department in one town in six"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: gov-appointments-weigh-counted-adults
blocked-on:
lead: governing
model: opus
effort: high
root: design-one-model-two-tiers
source: opus-5251's thirty-place count on pull request 8830 (seed th3), Nov 11, 2026, and the five appointments' own reasons
checked:
claimed-at:
---

**What.** With pull request 8830, a town's department heads are weighed over the whole town. Even so, across thirty drawn places (seed th3), 5 of 183 heads are still the player's parents or brothers and sisters. The player's household holds 96 of about 149,500 of those towns' adults, so its fair share is well under one head. In a new life the player is still an official's child in about one town in six. Seen: Politics, Government, where a town's department heads stop being the player's own household.

**Cause.** Found in code: `townPostInput` and the appointments' own reasons (`AppointmentRow.reasons`), read by opus-5251 on branch claude/gov-appointments-weigh-counted-adults at eda2491e85. `townPostInput` in src/core2/modules/executive.ts weighs two pools by different rules. Every full adult of the town who is not holding a post, seated, the appointer or the player becomes a candidate (`adults`, lines 521 to 534). Only the top `townPostCountedCandidates` (3) counted adults join them (`counted`, lines 509 to 520). So a post's candidates are mostly full people, and the player's household is a large share of the town's few full adults (its family and circle, about eight sampled households, and public workers' households, `fullPeople` in src/core2/residents.ts, line 245).

All five household heads won against other full people. In each, the top three candidates were full people, and none was a counted adult:

- Jeffersonville, Vermont (5036475), seed th3:3, fire chief: total 1.839 against 1.771, alignment 0.854 against 0.833.
- Diablo Grande, California (0619155), seed th3:9, public works: 1.701 against 1.687, alignment 0.996 against 0.768, though the winner's qualification was 0.55 and the runner-up's 1.
- Lake California, California (0639460), seed th3:10, county administrator: 1.897 against 1.895. Here the appointer is in the player's household and the winner had acquaintance 0.25.
- Porter, Washington (5355540), seed th3:16, county administrator: 1.802 against 1.779.
- Caribou, Maine (2310565), seed th3:22, fire chief: 1.678 against 1.625, qualification 0.7 against 1.

The holders' "Fire Chief" and "County Administrator" jobs are the jobs the appointment itself created (`job:public:town:<post>:<person>`), not jobs held at the opening. opus-5251's first reading of two of the five (on pull request 8830) was wrong on that point.

**Fix.**

1. **One list for both tiers.** In `townPostInput`, take the candidates from the one reader `suitedResidents` (src/core2/modules/offices.ts), over full and counted adults together. It already ranks both tiers by the same three traits and leaves out the passed ids. Take its top `townPostCandidates` (rename `townPostCountedCandidates`; TUNABLE, start 8, spread 5 to 12). A full adult is weighed only where they rank there, as a counted one is.
2. **Keep a person on record already doing the work.** A full adult whose current job's `occupationClassification` is in `RELATED.posts[post]` joins the list as well, so a town's working fire captain is weighed for fire chief. This comes from their record, not from being full.
3. **No rule about the player's family.** As in gov-opening-seats-go-to-the-players-own-family, part 3.
4. **Not daily.** The list is read at the opening and at a vacancy, as now.

**Time box.** 2 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One model, two tiers (owner, Oct 14): a pool that takes every full adult but only three counted ones is a rule that applies only to full people. No dice. One rule, all 56 places. Speed (owner, Oct 29): `npm run speed:year` on the same base and machine.

**Done when.** src/core2/modules/executive-town-heads.test.ts, over thirty drawn places with seed th3, asserts that the share of heads from the player's household is no higher than its share of the town's adults plus one head. It names the places with a household head, and it passes. A second session, in the running game on main at 1440x900, starts ten new lives in drawn places it writes down with their seeds. In at most one of them a department head on Politics, Government is in the player's household. The same test counts the elected local seats at the opening over the same thirty places, and the household's seats come down toward its share of the town's adults (seats times share, summed), as its department heads do. `npm run speed:year` shows no year more than 20% slower.

**Waits on.** gov-appointments-weigh-counted-adults (pull request 8830) and gov-opening-seats-go-to-the-players-own-family (pull request 8827), which it builds on.

**Files.** src/core2/modules/executive.ts, src/core2/data/campaigns/parameters.json, src/core2/modules/executive-town-heads.test.ts (new)

**Notes.** Filed by opus-5251, Nov 11, from pull request 8830's thirty-place count, at the lead's request (Fable B).

The elected seats too (opus-5251, Nov 11, from pull request 8862, on main 6e585134a6). The household holds 10 seats over three ten-place draws, against 3.8 for its share of each town's adults: about 2.7 times. Seed 4cd632543dfd8658: 2 against 0.9. Seed 71e2e0a0b9664a45: 3 against 1.1. Seed 4d5752c19b12cd28: 5 against 1.8. The cause is not yet read. `suitedResidents` (src/core2/modules/offices.ts, line 450) already ranks full and counted adults on one list by `seatFit`, so it is not the top-three cut the department heads have. The first thing to read: each counted record enters that list once, but it stands for `weight` real adults (`countedResidentsOf`). The share above counts weights, so where weights exceed one, the town's full people are over-weighted on the list.
