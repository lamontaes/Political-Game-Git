# B21 Family: meet a partner through the world, a few moments with your kids

Bank id b21 (spec file `b21-family-partner-and-kids.md`) · Phase "Two tracks to President (family costs)" / Living world · Unlocks D-4, "what politics costs a family".
Code checked at origin/main ec9a9601a.

## What the player experiences

You meet the person you might marry the way people do: a coworker you keep running into, a volunteer on your first campaign, someone from the party office, an old classmate. Nobody is on a romance list; anyone you have spent time with can come to like you, and sometimes they ask you out first. Dating, moving in, proposing and starting a family are things you ask and they answer for their own reasons; a no is as real as a yes. Your partner has their own job, views and limits, and a ninety-hour campaign week can lead to a hard conversation at the kitchen table. When you have children, a few moments in their childhood come to you as the parent (the night your son is caught fighting, your daughter wanting to quit the team) and what you decide shapes who they become. The rest of raising them happens in the background, decided the way your character would decide it, and you read about it in the journal.

## Owner decisions it rests on

- "Family: meet a partner through the world; a few moments with your kids that shape them; rest background." Sessions 6 and 7 own life records and the journal; this doc shares their files, does not fork them.
- OCD-LIFE-008: partners have their own personality, priorities, career and boundaries; no best-spouse or usefulness score; a 90-hour week can cause a scene, never at a fixed threshold. LQ-07: the partner decides about a child for their own reasons. LQ-12: two partners kept until one is ended; cheating banked. D-4: what politics costs a family. Childhood light: 3-6 short sim-picked scenes.
- Zero dice. Nothing blank. One rule for all places. One writer per record kind. Delete what you replace.

## Existing code to extend (verified)

- `src/simulation/couples.ts:93 dateRefusal`, `:127 coupleBetween`, `:141 keptDates`, `:168 romanticConsiderations`, `:303 askToBeACouple`, `:400 endCouple`; `:54 DATES_BEFORE_ASKING = 2` used at `:274`; header (:28-42) says PLACEHOLDER, no model of attraction. It already defines `DATE_OCCASION = "date"` (:46-47), so a date occasion exists as a contact tag; `initiator-occasions.ts:49 InitiatorOccasionReason` is only birthday, new-home, new-work (the spec said to add one: add `date` there).
- `couple-stage-data.ts:12 COUPLE_STAGE_CHOICES`; `couple-stage-contract.ts:26 coupleStageOptions`, `:45 coupleStageConsent`; used only by `living-world/town-couple-actor-adapter.ts:28`. `src/presentation/people-contacts.ts:253 romanticActions` (private; ask out, couple, end only).
- `people-family-plan.ts:128 familyPlanAvailability`, `:179 proposeFamilyPlan`, `:446 familyPlanTransitionHandler`; `people-contact.ts:388 proposeContact`, `:702 npcContactAnswer`; `social-introductions.ts:266 introductionCandidates`. Orientation: no recorded romantic orientation exists (`life-personality.ts:18` "Orientation" is unrelated).
- `src/presentation/childhood.ts:60 caregiverFor`, `:75 projectChildhoodMoment`, `:114 playChildhoodMoment` (calls `caregiverChoice` :150; `:267 caregiverChoice` exported; `:171 OPTION_LEANS`); `formative-play.ts:101`, `:281`; `character-history.ts:2254 formativeIntervalAt`.
- `src/simulation/people-upbringing.ts:798 upbringingFor`, `:814 readUpbringing` (private; caregiving fixed to `"estimated-care"` at :860), `:877 upbringingTraitTendencies`. `childhood-record.ts:78 appendChildhoodEntry` (kinds: birth, school-year-move, no-school-on-record). `situation-selection.ts:235 selectSituation`. `living-world/town-families.ts:109 TOWN_FAMILY_CHANCES` (Q2 part 8 removes it).
- Research on file: `docs/research/requests/how-two-people-become-a-couple.json`, `how-american-couples-form-in-numbers.json`, `how-couples-form-and-decide-on-children.json` (placeholders in people-family-plan.ts: 2-day answer, 273-day birth, nobody plans past 45), `when-a-couple-plans-a-child.json`, `childhood-choices-relational-meaning.json`, and `cto-notes/a136-couple-calibration.md`. Newer code covering part: none.

## Build steps (each is one PR)

1. **Interest from time together.** Replace the attraction placeholder in `romanticConsiderations` with considerations read from the pair's record: count and recency of `relationshipInteractions`, warmth via `readRelationshipStanding`, shared settings (work, campaign, school, party chapter), age gap against each person's own life stage, personal-values agreement, the answerer's temperament. Add a recorded romantic orientation at creation (inborn record, same seeded method as inborn traits, calibrated to a Gallup-type national identification by birth cohort: needs one sourced lookup). Replace `DATES_BEFORE_ASKING` with a reader of both people's deliberation traits. Must NOT: show any score.
2. **They can ask first.** Add `date` to `InitiatorOccasionReason`: a person who has met the player and whose considerations toward the player clear their own decision invites them out through the existing contact path; the player answers in a Session 4 scene. NPC to NPC uses the same evaluator (`town-couple-actor-adapter`).
3. **Player couple stages.** Extend `romanticActions` with "Ask to move in", "Propose" and "Talk about children" (to `proposeFamilyPlan`), offered from `coupleStageOptions`; the partner answers with the evaluator the NPC adapter uses, consent through `coupleStageConsent`. The wedding is a Session 4 scene at a place from b24's library, guests from both people's records. A romance with someone who works for you is allowed and recorded (see the switch below).
4. **Politics costs a family.** Partner considerations read when the partner answers or reviews the relationship: recorded hours away (campaign routine, office schedule), missed commitments (expired invitations from the partner), relocation for office, public scandal touching the household (b26 matters). They feed the partner's own stay-or-leave decision at their scheduled review. No meter.
5. **Kids' moments.** When `caregiverFor` is the controlled person, a formative moment is offered to the player as the parent's choice (caregiver-led band: the player picks; shared band: the child chooses from temperament with the parent's steer as a consideration; adolescence: the child's own). Which moments reach the player goes through `selectSituation`; the rest resolve with `caregiverChoice` from the player character's temperament, exactly as for any parent.
6. **Moments shape the child.** Add a `caregiver-choice` entry kind to `childhood-record.ts`, written inside `playChildhoodMoment`, citing the formative event. `readUpbringing` derives `caregiving` and protective caregiving from these entries and NPC caregivers' background choices instead of always `"estimated-care"`; `upbringingTraitTendencies` then moves traits. The child page and journal show the moment and the child later remembers it (knowledge record). Replaces the fixed estimate.

## Must not build

A romance-options list, compatibility percentage, attraction score or best-spouse ranking; any fixed number of dates, years before marriage or kids' moments; a random roll on an answer; a second couple engine for the player; a parenting minigame, chores or family-time meter; daily ticks over children; authored romance or parenting dialogue (Session 4 composes scenes); cheating or multiple partners as a mechanic (banked).

## Research tables

Filed requests above hold the open pace, consent and child-timing questions (all still PLACEHOLDER in code). Needed for step 1 only: share of adults identifying as LGBT by birth cohort (Gallup annual identification report; one lookup, 10 minutes, cite, keep as a data table keyed by cohort; a cohort with no row takes the nearest cohort and is marked estimated). Orientation is recorded privately and never displayed as a stat.

## Done when

Random place, play an 18-year-old a few years with a job and a campaign: a coworker or volunteer met only through those settings invites the player out or accepts a date with recorded reasons; the player asks to move in and to marry through Contacts and gets answers citing the partner's own considerations; the partner proposes or agrees to a child through `proposeFamilyPlan`. With a child aged 5-12: one formative moment is offered to the player as parent; the childhood record then holds a `caregiver-choice` entry and `upbringingFor(child).caregiving` is no longer `"estimated-care"`; skipping years resolves the rest in the background with the player character's temperament in the trace. Tests: `couples-interest.test.ts`, `player-couple-stages.test.ts`, `childhood-parent-moment.test.ts`; existing `couples` and `people-family-plan` tests still pass.

## Proof to post

Under `docs/codex/evidence/b21-family/`: screenshots of the date invitation, the move-in and marriage answers, a parent moment; printed considerations behind two answers (one yes, one no) and the child's record entry with the upbringing before and after.

## Standing rules

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."

Open owner questions named in this doc: may a romance start with someone who works for you? Open item with its switch:

- One function `workplaceRomanceWeighs(asker, answerer)` returns considerations. Default (recommended option b): allowed, recorded, and the character's own principles weigh against it. Option a drops the principle consideration; option c returns a constraint that refuses. Changing the ruling edits that function only.
- Orientation calibration table not yet pulled: a data table with `basis: "estimated"` (national all-cohort share) that the sourced rows replace.
- If Session 4 scenes, Session 6 `recordFamilyAddition` or Q2 part 8 have not landed: steps 1, 2 (record side), 3 (data and evaluator), 4, 6 now; steps 3's wedding and step 5's offer use a stubbed `offerToPlayer(moment)` that falls back to `caregiverChoice`.

## Standing rule (owner, Oct 5)

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."

## Owner ruling, Oct 6 12:20 a.m.

The random 'ask this person on a date' prompt is WRONG and is deleted. Romance progresses naturally from time spent together (shared places, repeated meetings, conversations), with the engine calibrating pace from the two people's records; no prompt, no dice.
