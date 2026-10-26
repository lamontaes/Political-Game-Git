# Career to elder statesman; movements and standing groups passing to a successor (bank id b20, phases: two tracks to President (career) + living world (movements))

Verified against origin/main e403b9bfd (Oct 6). Bank spec: docs/codex/specs/bank/b20-elder-statesman-and-movement-succession.md. Builds on b04 (which creates the standing group); this extends it.

## What the player experiences

A political life does not stop when you leave office. After your last term, or a loss you do not come back from, you are still somebody. Candidates come asking for your endorsement. The young aide who went everywhere with you is now seen around town as "your protege" (nobody labels it; people just treat that person differently). A governor may appoint you to a board. Reporters call for the long view. You can campaign for people you believe in. If you built a movement, it does not die with you: a party you founded, a cause group, or a standing group your campaign turned into when people joined. It can happen at any time, win or lose. When you step back or die, its members decide who leads it: your daughter, your protege, your old ally. The successor carries your agenda but has their own ambitions. Followers stay, drift or leave depending on how they feel about the new leader. If you continue as that successor, you inherit the members and goodwill, not your parent's friendships wholesale.

## Owner decisions it rests on

- D-4: "A career from first race to elder statesman: protégés, primaries, life after office, family costs."
- Register, Sept 26: "A successor who is similar to the founder can inherit leadership of the movement... Successors have their own motives." "Even if you fail your son can ride the wave of your movement."
- Register, Sept 28: "Protégés that are implicit: people infer them from who brings you everywhere." "Post-career life as an elder statesman."
- Owner (this round): a campaign can become a standing group at any time if people join (b04 builds the group; extend it here).
- "Endorsements are NOT transactional by default... Anyone wanting something wants it for their own reasons."
- Fixed: zero dice; nothing blank or placeholder (estimate and mark); one rule for all 50 states, D.C., territories; emergent not authored; one writer per record kind; delete what you replace.

## Existing code to extend (verified on e403b9bfd)

- `src/simulation/living-world/party-evolution.ts`: `partyUnitLeaders :205`, `ensurePartyLeadership :228`, `partyPlatformAt :404`, `recordPartyBodyDecision :481`, `assessPartyInitiative :673`, `respondToPartyInitiative :933`, `adoptPartyInitiative :1246`, `scheduleBodyReview :1765`. Correction to the bank spec: `recordPartyBodyDecision` decides a platform QUESTION from a catalog (`question(input.questionKey)`) and calls `requireActiveUnit`, so it is party-only and cannot pick a leader as written. Leader choice needs a sibling decision function (step 2), not a rename.
- Groups: `living-world/law-interest-groups.ts:78 joinLawInterestGroup` and `living-world/party-chapters.ts:813 joinPartyChapter / :889 leavePartyChapter` (membership pattern). The b04 assignment adds kind `standing-group-member` through the same machinery; read that PR first and use its organization and participation shape. `civic-actions.ts` group-member stake (b04 extends its `groupMembers` set).
- Successors and bonds: `src/simulation/people-continuation.ts:273 successorCandidates` (relation "protege"/"mentor" :246-247, :344-349), `:371 meaningfulBonds` (private), `:496 continueAsRelative`.
- Mentorship read: `src/simulation/person-context.ts:590-621` (reads `mentorship:*` interactions). Note: the bank spec says `presentation/person-context.ts`; the file is `src/simulation/person-context.ts`.
- Standing and favors: `src/simulation/favors.ts:339 favorStandingBetween`, `:391 favorsBetween`, `:421 feltDebtConsiderations`, `:82 recordFavor`; `patronage/following.ts:32 townFollowing`; `patronage/appointments.ts:111 appointmentCircle`, `:410 chooseAppointee`.
- After office: `careers/another-term.ts:80 decideAnotherTerm`, `:192 lifeWeighsAgainstOffice` ("years after office" consideration at :384). Campaign backing as a favor: `campaign-life-activities.ts:1920 political:chapter-backing`.
- Ambitions: `people-goal-pursuit.ts:95 activeGoalFor`. Views and reasons: `political-belief-formation.ts`.
- Newer code covering part: none. `movementOf`, `inferredProtegeOf`, `stepDownFromLeadership` do not exist (grep clean).

## Build steps (one PR each, in this order)

1. **A movement is an organization plus followers; no new store.** New reader `movementOf(world, personId)` in new `living-world/movements.ts` (imports party-evolution): the party unit, cause organization or b04 standing group the person founded or leads (`leader:*` participation), its members, its platform (`partyPlatformAt`, or for a group the cause it formed around), and its following (members plus people whose recorded view reasons cite the leader). A following with no organization is allowed (`organizationId: null`). Founding uses the existing `founding` initiative and b04's form-group function; no second founder path. Must not: copy member lists anywhere.
2. **Leadership passes by the members' own decision.** New `decideSuccession(world, organizationId, cause)` beside `recordPartyBodyDecision` (extract the shared vote-tally helper rather than copy it). Trigger: leader dies, leaves play, or runs the new `stepDownFromLeadership` command (writes the participation end). Candidates: living members and close ties of the old leader (kin, mentorship bonds, long collaborators). Each member votes through `evaluateDecision` from closeness of the candidate's recorded positions to the platform, relationship to the candidate, the candidate's relationship to the old leader, and their own temperament. No similarity threshold. Records each vote with reasons. Works for parties, cause groups and standing groups. Must not: a score, a blood rule, a draw.
3. **Followers stay, drift or leave.** At each member's next scheduled review (`scheduleBodyReview`) they weigh the new leader. Someone who belonged for the old leader personally may leave; one who belonged for the cause stays. Plain participation changes, no daily tick.
4. **Implicit protégés.** `inferredProtegeOf(world, observerId, personId)` in `simulation/person-context.ts` beside the mentorship read: an observer infers it from interactions they witnessed or heard of where the elder repeatedly brought the younger along (shared events, campaign help, appointments, introductions). Others then treat the protégé with a share of their standing toward the elder via `favorStandingBetween`. No label shown anywhere.
5. **Life after office.** When a person leaves their last office (term end, `decideAnotherTerm` says no, or a loss): (a) endorsement asks from candidates who know them, answered by `evaluateDecision` from agreement and relationship (write a favor only when the giver's reason is reciprocity); (b) appointment eligibility via `appointmentCircle`; (c) reporter calls through the existing press interview producers; (d) campaigning through the existing campaign activity path. Player asks reach Session 4's scene rows; NPC versions run only when a campaign or vacancy needs them.
6. **Heir and movement.** Knowledge and favors come from the queued heirs work (`continueAsRelative`). This PR adds only: if the picked successor is also chosen leader by step 2, the members and their standing come with the leadership; no copy.

## Must NOT build

Legacy points or movement-strength meters; a similarity percentage deciding inheritance; a fixed retirement age or fixed share of followers who stay; a parallel party or group system; automatic blood inheritance; endorsements as automatic favor-for-vote trades; copying the dead person's relationships onto the successor; authored elder-statesman scripts; a daily tick over former officials.

## Research tables

None needed (no amounts). Existing party and organization research in `data/research` is calibration only. Nothing in the repo gives how often founders are succeeded by kin, and none should be invented.

## Done when (played-game proof)

- Random place, observer run 20+ years: someone founds a group or party, leaves office, is asked for an endorsement (given or refused with recorded reasons), dies; the body picks a successor with each member's considerations printed; some members leave citing the old leader.
- Player run: campaign becomes a standing group (b04), recruits members, retire the character, continue as a child; the child leads only if the members' decision says so; person page shows the movement and leader; b19's look-back names who carries the cause. Same flow in a territory/D.C. place.
- Tests: `movement-succession.test.ts` (same world and death give same successor; changing one member's relationship changes that vote, not a flip), `inferred-protege.test.ts` (witness treats the younger better; non-witness does not), `after-office-endorsement.test.ts` (decision cites agreement/relationship; no favor unless reciprocity).

## Proof to post

PR comment per step: random place and seed, printed `movementOf` rows, each member's vote reasons with record ids, the people who left and why, the delete list for each "Replaces:", and `npm run typecheck` plus the changed tests passing.

## Standing rules

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building.
Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building.

- Open question: a retired-but-living leader keeps leading as an NPC until death or step-down (a), or leadership passes at once (b). Switch: one data row `retiredLeaderKeepsLeading` (default true, per a); b is changing the row. Step 2 handles both.
- Dependencies without waiting: build against whatever b04 and the heirs work have merged; stub with the existing `joinPartyChapter` shape if b04's group is not on main yet and swap when it lands.
