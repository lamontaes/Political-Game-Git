# P2 audit: legislator votes and their recorded reasons

## Record at the end

- Enactment 2025-001 (`bill:office:gus2025:134411:board:2025-02-04:person_df7360cd247fc890:0`), sponsor person_df7360cd247fc890: 5 yes, 2 no, status enacted.
- Repeal 2025-018 (`...:2025-02-19:person_0692d7c8305dc27d:17`), sponsor person_0692d7c8305dc27d: 4 yes, 3 no, status enacted.
- The same question has 26 county bills, all enacted, alternating value 1 and 0, 13 sponsored by each of person_df7360cd247fc890 and person_0692d7c8305dc27d. All 26 law rows have endDate null (A-county-bill.json lawRows).
- Position terms, identical on both bills unless noted:

| member                    | enactment: views / cons / sponsor / trait / total | repeal: views / cons / sponsor / trait / total | trait (both bills) |
| ------------------------- | ------------------------------------------------- | ---------------------------------------------- | ------------------ |
| df7360 (sponsor 2025-001) | .121 / .018 / 1 / .248 / 1.388 (yes)              | -.121 / -.018 / .00055 / .248 / .110 (yes)     | .248               |
| 74b741                    | -.037 / .018 / 0 / .080 / .061 (yes)              | .037 / -.018 / 0 / .080 / .099 (yes)           | .080               |
| e21f85                    | -.062 / .018 / 0 / .122 / .078 (yes)              | .062 / -.018 / 0 / .122 / .166 (yes)           | .122               |

Trait values for all seven county members match across both bills. Cons is the same for all members in a vote (district lean times the stance).

## Decision points

- `legislature.ts:positionOn` (1094-1155): views = `personStance(lean, q) * position` (1101), no weight (weight 1). Position is +1 or -1 from the provision value (`provisionStance`, 561-575). Lean comes from `leanOf` (978) and `personLean` (campaign-views.ts:171-226). Source of the lean: campaign-views.ts:97-124 (`normalOf` seeded Box-Muller via `stableHash`, `openingLeanKey`), ranked within place (213-220). Source tag of the mix: `personalityLeanCorrelation` 0.2 ESTIMATED, `leanPerDutyBound` / `leanPerGenerous` / `leanPerPractical` ESTIMATED, all with stopgap `SG-GOV-views-stand-in`.
- `positionOn` constituents (1102, 1119-1124): `constituentWeight` 0.5 TUNABLE (`src/core2/data/campaigns/parameters.json:197`). Input is the town's district lean (`townLean`, from 2024 House vote, `districtLean` campaign-views.ts:53-61).
- `positionOn` sponsor (1107-1111): **hard-coded `1`** for the sponsor; otherwise `sponsorRelationshipWeight` 0.5 TUNABLE (`campaigns/parameters.json:185`) times relationship level.
- `positionOn` deal (1112-1118): only deals the member took; zero on these bills. `lobby` (1120): sum over `positionTerms`, empty here.
- `positionOn` trait (1133-1135): `traitLean(api, memberId, "legislature.member-position", ["yes","no"])`. No bill argument. `traitLean` (1003-1013) = `traitDecisionWeight` (0.5 TUNABLE, `src/core2/data/parameters.json:4568`) times `decisionLean` (`src/core2/trait-decisions.ts:47-79`), which clamps (yes minus no)/`traitLeanScale` (0.6 TUNABLE, parameters.json:4541) to [-1, 1]. The yes/no option act kinds come from `data/content/trait-decisions.json`, row `legislature.member-position`: yes = change, cooperate, commit; no = keep-same, refuse, delay.
- `chamberVote` (1344-1380): member votes yes if `position.total > 0`, no if `< 0`, abstain at 0 (1362). Player choice overrides.
- `holdVote` (1616-1680): tie goes to a breaker or fails; pass needs `tally.yes > tally.no` (1665); Senate cloture `senateClotureShare` 0.6 SOURCED (`campaigns/parameters.json`).
- Federal members (`officialParts`, `officials.ts:1010-1080`): add party, wing, ambition, press, weighted by the `weight(...)` table. Not traced numerically; the trait term is the same code path as the county board.

## Verdicts

1. Seeded roll decided an actor's outcome? **Yes, partly.** Each member's opening lean (`campaign-views.ts:118-119`, `normalOf` on `lean:person:<id>`) is a hash-seeded draw. It carries 98% of the non-personality part of the lean (`sqrt(1 - 0.2^2)`, line 127-130) and feeds the views term (1101). This is seeded generation of an attribute, which the owner's rule allows for "who exists"; the owner should decide whether a fixed per-person draw may steer votes. No per-vote roll.
2. Anything flips at a threshold? **Yes, at zero.** Sign tests `total > 0` (legislature.ts:1362) and `tally.yes <= tally.no` (1665). The cloture 0.6 is sourced. No other cutoff. Not parameterized.
3. Record written that no other engine reads? **Partly.** The vote row (`table(api,"votes")`, 1372) is read by `recalls.ts:193,318` and `src/bench/legislature.ts:93`. The four position parts (views, constituents, sponsor, trait) are read only inside `total`. Play screens not checked.
4. Shortcut without a registered stopgap? **Yes.** Hard-coded `sponsor = 1` (legislature.ts:1108-1110) and the bill-blind trait term (1133-1135) have no row in `src/core2/data/stopgaps.json`. `SG-GOV-views-stand-in` is registered and open.
5. Player-visible zero or UNKNOWN? **No UNKNOWN.** Zeros for deal and lobby are real (none recorded). Town members have no party, wing, ambition or press terms (parts null, 1094-1098, 1146-1155): zero by absence.
6. State, city or GEOID named in logic? **No** in the vote path. `tieBreaker` names the national id `seat:US:vice-president` (legislature.ts, `tieBreaker`), not a place.
7. Mechanic outside golden path, baseline or owner request? **No new mechanic.** Votes with reasons are covered by the baseline's amendment and committee votes rows. Not checked row by row.

## Defects

- Rule "trait lean must follow the bill" broken | `legislature.ts:positionOn` (1133-1135), `trait-decisions.ts:decisionLean` | person_74b741e80d2fb481, person_e21f852c93ddac80, person_df7360cd247fc890 (and all seven) | trait term is the same on enactment and repeal, so a "cooperate/commit" trait votes yes on both (74b741: .061 then .099).
- Hard-coded sponsor yes (rule: every number in the parameter table) | `legislature.ts:positionOn` 1108-1110 | person_df7360cd247fc890 (1.388 on own bill), person_0692d7c8305dc27d (0.997) | a sponsor votes yes on own bill whatever their views; 26 of 26 bills passed.
- Repeat flip-flop of one question | `legislature.ts:holdVote`, `chamberVote` | 26 county bills, Ordinance 2025-001 to 2026-004 series | the board re-enacts and repeals the same question every cycle; no engine records why. Law resolver shows the latest row (`law-in-force-by-date.json`, 2025-03-22 governs 2025-018), but the earlier rows keep endDate null (A-county-bill.json lawRows).
- Stale cache (not reached) | `campaign-views.ts:personLean` (`leans` WeakMap, computed once per people map) | not verified whether views changing mid-run update the lean.
- Federal sample is one bill (us-house 2025-001, 80 of 533 votes recorded, all yes; `B-federal.json votesSample`). Cross-bill trait constancy for federal members could not be checked.
