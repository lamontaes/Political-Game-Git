# A household needs a recorded decision before a child is born

The town currently draws births from age rates and rescales each person's chance to match the town total. That draw does not establish whether either parent wants a child. The replacement will read the household's own circumstances and record its reasons. Missing intention or timing evidence will remain unknown. The arrived research separates intention from realized birth but supplies no prospective timing mechanism. That mechanism remains the blocker for the birth writer; the pure circumstance reader is published for review.

## 1. Why-chain

Measured in source: `src/simulation/living-world/town-families.ts:668` builds weights from age, relationship stage, children and working status. It rescales those weights to age-specific rates, multiplies by `outcomeFactor`, then compares a seeded draw with the resulting chance. The chain ends at a calibrated population draw. It never reaches either parent's recorded intention.

Measured in source: `src/simulation/people-family-plan.ts:179` records one person's request. The answer evaluates temperament with close-choice randomness. An agreement schedules a family addition after an authored wait. This chain reaches intention and a child record, but its answer and waiting period do not establish fertility timing. Neither path is an empirical conception model.

The replacement chain is household records, explicit intention, circumstances, a dated decision, a supported timing record, then the existing family-addition writer. Unknown intention cannot become agreement. Agreement cannot alone establish pregnancy or guarantee a birth.

## 2. Research

Source receipt: [Team 9’s bounded fertility packet](https://github.com/lamontaes/Political-Game-Git/blob/2b7db15fd6c26e490f4f63f72adb41a489a779b2/data/research/standing-research/team-9/fertility-intentions-bounded.md). Its two primary NSFG studies distinguish wanting, intention, certainty and intended timing. They are repeated cross-sections or retrospective birth reports, not prospective intention-to-birth conversion estimates. The packet supplies no causal income weight or admissible conversion range. Measured in source: `src/simulation/birth-rates.ts:2` supplies births per 1,000 women per year by age. Inference: those population rates establish neither individual intention nor conception.

The packet recommends keeping intended number, timing, certainty and each partner’s own record distinct. Measured in source: `src/simulation/people-family-plan.ts:218` tags the request kind but records no intended number, timing or certainty fields. Descriptive certainty or timing percentages must not become decision weights or research uncertainty ranges.

Measured in source: `data/research/outcome-web/links.json:1480` scales the place’s birth rate by -0.014 to -0.005 per percentage-point unemployment increase, delayed nine months. This is a proportional rate effect, not a monthly individual birth chance. Measured in source: `data/research/outcome-web/links.json:1532` gives child credit an inert zero size; the adjacent baby-bonus entry lacks a size. Measured in source: `data/research/outcome-web/links.json:1600` limits its abortion-effect anchor to near-total bans. These entries require separate applicability checks. Those aggregate findings do not specify a household decision threshold. The actual reader must keep each cause, researched coverage and lag; no new conversion or universal rate is supplied here.

## 3. Revisions

Keep recorded age separate from biological capacity. Keep gender identity separate from an inferred reproductive role. Read current partnership and household membership at the decision cutoff. Read parent-child records rather than infer parity from household size. Read family-plan events as recorded requests and answers; do not invent preferences for people with no plan.

Read dated compensation, rent obligations and actual dwelling occupancy. Missing money is unknown, not zero; working status is not income. A dwelling record is not proof of space, affordability or consent. Preserve player commands and adoption rules. Do not add a second resolver for an existing scheduled plan.

## 4. Numbered parts

1. Build a pure circumstance reader from existing records, retaining source IDs and explicit missing inputs.
2. Replace only the seeded child-selection block in the town review. Partnership and dating behavior remain outside this claim.
3. Add a durable, deterministic household decision with proceed, defer and unknown outcomes after prospective evidence establishes the interpretation of intention and timing. No seeded birth choice or rescaling to a population total.
4. Carry the effects-map pressure and its causes into that decision. Determine how the pressure affects timing only from applicable research.
5. Schedule or write a child only from a supported dated resolution. Reuse the existing family-addition writer and avoid duplicate player-plan resolutions.
6. Test unknown intent, disagreement, changed circumstances, policy pressure, replay and save/continue. Require a watched-world receipt before acceptance.

## 5. SIMULATED / RECORDS / WORLD PIECES / CHECKS

SIMULATED, proposed: a household chooses from recorded circumstances; no fertility rate is guessed.

RECORDS, measured in source: `src/simulation/living-world/household-birth-circumstances.ts:44` reads dated ages, memberships, partnerships, family plans, children, compensation/rent terms and occupancy. Compensation terms do not establish all income or observed take-home pay.

WORLD PIECES, source finding: `src/simulation/living-world/household-birth-circumstances.ts:118` marks reproductive capacity, intention-to-birth timing and household policy response as missing. The reader supplies no contraception, pregnancy or room-capacity observation. Those gaps are not measured absence or refusal.

CHECKS, measured: `docs/codex/handbacks/team-3-replacement-checks.json` records 3 of 3 focused reader tests passing, 2 strict type roots with 0 diagnostics, and scoped lint passing. The decision writer, timing and watched-world checks are NOT RUN.

Terminal: recorded intentions exist for explicit family plans. Source finding: `src/simulation/living-world/town-families.ts:668` contains no NPC intention producer; that finding does not establish anyone’s actual wishes. The bounded packet confirms that prospective research still must connect intention and circumstances to dated realization. Until those inputs exist, no person feels a newly implemented birth-pressure decision yet.

## 6. Random-place proof

NOT RUN. The proof must name an actual household, both adults' recorded ages and intentions, income records, actual home, applicable law, drawn link size, decision reasons and any dated resolution. Log unknown inputs and nonbirth decisions. A fixture is not a watched household.

## 7. Named worked example

NOT RUN. No family, income, policy result or newborn is invented for this design. The first example must come from the actual proof. A valid example can end in deferral or unknown; a child is not required to make the report look successful.

Method: CTO3:45 read in END00 on September 30, 2026. Design follows the published feature-walkthrough structure. Exact source seam requested by that dispatch is the child-selection block in `town-families.ts:reviewTownFamilies`, plus a new pure circumstance reader and directly affected tests. No shared history schema, family-plan resolver, effects link or jurisdiction reader is claimed. Mechanical report check passes with zero errors and warnings. Independent civic report review passes. The pure reader and its tests are published draft work; neither is called by the town review. Measured source comparison in `docs/codex/handbacks/team-3-replacement-checks.json`: the town and family-plan seams are unchanged between the handoff base and inspected main. The new reader has only its focused test caller; births do not use it.
