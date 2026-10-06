# Family: meet a partner through the world; a few moments with your kids (bank id b21, phase Two tracks to President (family costs) / Living world)

## What the player experiences

You meet the person you might marry the way people do: a coworker you keep running into, a volunteer on your first campaign, someone from the party office, an old classmate back in town. Nobody is a "romance option" on a list; anyone you have actually spent time with can come to like you, and sometimes they ask you out first. Dating, moving in, proposing and starting a family are things you ask and they answer for their own reasons, and a no is as real as a yes. Your partner has their own job, views and limits; a ninety-hour campaign week can lead to a hard conversation at the kitchen table. When you have children, a few moments in their childhood come to you as the parent (the night your son is caught fighting, your daughter wanting to quit the team), and what you decide shapes who they become. Everything else about raising them happens in the background, decided the way your character would decide it, and you can read about it in the journal.

## Owner decisions this rests on

- "Family: meet a partner through the world; a few moments with your kids that shape them; rest background."
- OCD-LIFE-008: partners have their own personality, priorities, career and boundaries; no best-spouse or political-usefulness score; campaigning 90 hours can lead to a spouse scene, never a fixed threshold.
- LQ-07: "The player may propose a child or adoption to a partner through Contacts; the partner decides for their own reasons." LQ-12: two partners kept until one is ended; cheating banked.
- Couples ruling 2026-09-23 (couples.ts header): dating, living together, marriage all exist.
- D-4: "what politics costs a family." Childhood light: 3–6 short sim-picked scenes for the player's own childhood (Session 6); personality is the lens, life decides the side; zero dice.

## Existing code it must use

- `src/simulation/couples.ts:93 dateRefusal`, `:127 coupleBetween`, `:141 keptDates`, `:168 romanticConsiderations`, `:303 askToBeACouple`, `:400 endCouple`; `:54 DATES_BEFORE_ASKING = 2` (placeholder constant); header :35-42 says there is no model of attraction.
- `src/simulation/couple-stage-data.ts:12 COUPLE_STAGE_CHOICES` (move in, marry, break up; consent both/either); `src/simulation/couple-stage-contract.ts:26 coupleStageOptions`, `:45 coupleStageConsent` — used today ONLY by NPCs (`living-world/town-couple-actor-adapter.ts:28`).
- `src/presentation/people-contacts.ts:253 romanticActions` — Contacts offers "Ask out", "Ask to be a couple", "End things"; no move-in, marry or family-plan action for the player there.
- `src/simulation/people-family-plan.ts:128 familyPlanAvailability`, `:179 proposeFamilyPlan`, `:446 familyPlanTransitionHandler`.
- `src/simulation/people-contact.ts:388 proposeContact`, `:702 npcContactAnswer` (romantic block); `src/simulation/initiator-occasions.ts` (a known person initiating a call or invitation); `src/simulation/social-introductions.ts:266 introductionCandidates`.
- `src/presentation/childhood.ts:60 caregiverFor`, `:75 projectChildhoodMoment`, `:114 playChildhoodMoment` (caregiver-led band resolves by `:267 caregiverChoice` from the adult's temperament; OPTION_LEANS :171); `src/presentation/formative-play.ts:101 projectFormativeYears`, `:281 chooseFormativeOption`; `src/simulation/character-history.ts:2254 formativeIntervalAt`.
- `src/simulation/people-upbringing.ts:798 upbringingFor` / `readUpbringing` (caregiving is always `"estimated-care"` or `"not-recorded"`, schooling `[]`), `:877 upbringingTraitTendencies`.
- `src/simulation/childhood-record.ts` — per-child dated entries (`birth`, `school-year-move`, `no-school-on-record`), `appendChildhoodEntry`.
- `src/simulation/situation-selection.ts:235 selectSituation` (picks which eligible moment is offered).

## What to change

1. **Interest comes from time spent together.** Replace the attraction placeholder in `romanticConsiderations` with considerations read from the pair's record: count and recency of recorded interactions (`relationshipInteractions`), warmth via `readRelationshipStanding`, shared settings (work, campaign, school, party chapter), age difference against each person's own life stage, values agreement from `mind` personal values, and the answerer's temperament. Add a recorded romantic orientation to the person record at creation (an inborn record set with the same seeded method as inborn traits, calibrated to Gallup's identification by birth cohort, research row cited); the answer reads it. Replace `DATES_BEFORE_ASKING` with a reader of the asker's and answerer's deliberation traits (no constant).
2. **They can ask first.** Add a `date` occasion to `initiator-occasions.ts`: a person who has met the player and whose `romanticConsiderations` toward the player clear their own decision invites them out on the existing contact path. The player answers in a Session 4 scene. Same for NPC↔NPC (already via `town-couple-actor-adapter`), one evaluator.
3. **Player couple stages.** Extend `romanticActions` with "Ask to move in", "Propose" and "Talk about children" (→ `proposeFamilyPlan`), offered from `coupleStageOptions` for the couple's current stage; the partner answers with the same evaluator the NPC adapter uses and consent through `coupleStageConsent`. The wedding is a Session 4 scene at a place from the place library (b24), guests from both people's records.
4. **Politics costs a family.** Add partner considerations read when the partner answers anything or reviews the relationship: the player's recorded hours away (campaign routine and office schedule records), missed commitments (expired invitations from the partner), relocation for office, public scandal touching the household. These feed the partner's own stage decision (stay, break up) at their scheduled review, not a meter.
5. **Kids' moments.** In `childhood.ts`, when `caregiverFor(world, childId)` is the controlled person, a formative moment for that child is offered to the player as the parent's choice (caregiver-led band: the player picks; shared band: the child chooses from their own temperament with the parent's steer as a consideration; adolescence: the child's own). Which moments reach the player goes through `selectSituation` with the child's moments as candidates; the rest resolve with `caregiverChoice` using the player character's temperament, exactly as for any parent.
6. **Moments shape the child.** Add a `caregiver-choice` entry kind to `childhood-record.ts` (written inside `playChildhoodMoment`, citing the formative event). `readUpbringing` derives `caregiving` and `protectiveCaregiver` from these entries (and from NPC caregivers' background choices) instead of always `"estimated-care"`; `upbringingTraitTendencies` then moves the child's traits. The child page and journal show the moment; the child later remembers it (knowledge record).

## Must NOT build

- A list of "romance options", compatibility percentage, attraction score shown to the player, or a best-spouse ranking.
- Any fixed number of dates, years before marriage, or kids' moments; any random roll on an answer.
- A second couple engine for the player: NPC and player use the same evaluator and stage data.
- A parenting minigame, chores, or a family-time meter (cut by owner); daily ticks over children.
- Authored romance or parenting dialogue banks (Session 4 composes scenes).
- Cheating or multiple partners as a mechanic (banked).

## Done when (proof in a played game)

- Random place, play an 18-year-old for a few in-game years with a job and a campaign: at least one coworker or volunteer the player met only through those settings invites the player out or accepts a date with recorded reasons; the player asks to move in and to marry through Contacts and gets an answer citing the partner's own considerations; the partner proposes or agrees to a child through `proposeFamilyPlan`.
- With a child aged 5–12: one formative moment offered to the player as parent; after choosing, the child's childhood record holds a `caregiver-choice` entry and `upbringingFor(child).caregiving` is no longer `"estimated-care"`; skipping years resolves the rest in the background with the player character's temperament in the trace.
- Tests: `couples-interest.test.ts` (two people with many shared work interactions accept where strangers decline; same world, same answer); `player-couple-stages.test.ts` (move-in needs both consents; partner declines with recorded reason); `childhood-parent-moment.test.ts` (player-as-caregiver chooses; entry written; upbringing reads it; trait tendency changes); `couples` and `people-family-plan` existing tests still pass.

## Depends on

- Session 6 (life from birth: `recordFamilyAddition` for births, the player's own childhood scenes) — share `childhood.ts`, do not fork it.
- Session 4 (scenes for dates, proposals, the wedding, kitchen-table conversations).
- Queued Q2 part 8 (NPC couples through the same considerations; removes `TOWN_FAMILY_CHANCES`) — land the shared evaluator once.
- Q8 part 1 (child body family) so kids appear on screen.

## Open questions for the owner

- Can a romance start while you hold office with someone who works for you (a staffer, an appointee)? (a) Yes, it is just recorded and the press can find it like anything else; (b) yes, but your character's own principles weigh against it; (c) no, staff never date their boss.
