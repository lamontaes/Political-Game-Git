# Career to elder statesman; movements passing to a successor (bank id b20, phase Two tracks to President (career) + Living world (movements))

## What the player experiences

A political life does not stop when you leave office. After your last term (or a loss you do not come back from) you are still somebody: candidates come asking for your endorsement, the young aide who went everywhere with you is now seen around town as "your protégé", a governor may appoint you to a board or commission, reporters call you for the long view, and you can campaign for the people you believe in. If you built a movement (a party you founded, a cause group, or a following that shares your ideas), it does not die with you. When you step back or die, its members turn to someone like you to lead it: your daughter, your protégé, your old ally. That successor carries your agenda but has their own ambitions, the way Taft followed Theodore Roosevelt or Johnson carried Kennedy's program while pursuing his own. Followers stay, drift or leave depending on how they feel about the new leader. If you then continue as that successor, you inherit the movement's members and goodwill, not your parent's friendships wholesale.

## Owner decisions this rests on

- D-4 approved: "A career from first race to elder statesman: protégés, primaries, life after office, family costs."
- Register, Sept 26 vision: "A successor who is similar to the founder can inherit leadership of the movement... Successors have their own motives." "Even if you fail your son can ride the wave of your movement."
- Register, Sept 28 list: "Protégés that are implicit: people infer them from who brings you everywhere." "Post-career life as an elder statesman."
- "Losing: what carries forward depends on what the politician built (a movement carries a lot; most carry little)."
- "Endorsements are NOT transactional by default... Anyone wanting something wants it for their own reasons." "Appointed paths: someone who knows and trusts you can appoint you."
- Sept 28 #7 (heirs): heir starts with family stories as weaker secondhand knowledge; people treat the heir by the parent's favors and grudges.
- Emergent, zero dice, favors from personality never a %.

## Existing code it must use

- `src/simulation/living-world/party-evolution.ts` — party life: `:205 partyUnitLeaders`, `:228 ensurePartyLeadership`, `:404 partyPlatformAt`, `:481 recordPartyBodyDecision`, `:673 assessPartyInitiative`, `:933 respondToPartyInitiative`, `:1246 adoptPartyInitiative`; initiative kinds incl. `founding`/`split` (`world-setup/types.ts:206`).
- `src/simulation/living-world/law-interest-groups.ts` — organized interests as ordinary organizations with member participations (a cause group already exists as a shape).
- `src/simulation/living-world/party-chapters.ts:59-65` — chapter membership/organizer kinds and events.
- `src/simulation/types.ts:1401 Organization`, `:1409 OrganizationProfileRecord` (classification namespaces incl. `membership:`).
- `src/simulation/patronage/following.ts:32 townFollowing` — who owes a person, and recorded campaign help from them.
- `src/simulation/favors.ts:339 favorStandingBetween`, `:391 favorsBetween`, `:421 feltDebtConsiderations`; favor kinds `political:*` (`types.ts:1864`).
- `src/simulation/patronage/appointments.ts:111 appointmentCircle`, `:410 chooseAppointee` (appointers choose people they know).
- `src/simulation/careers/another-term.ts` — whether an officeholder runs again, from health, age, care duties, temperament ("years after office" consideration :384).
- `src/simulation/people-continuation.ts:273 successorCandidates` (mentorship bonds → protege/mentor :344-349), `:371 meaningfulBonds`, `:496 continueAsRelative` (successor told only family facts :535-565).
- `src/simulation/campaign-life-activities.ts:1916` — a chapter's backing recorded as a `political:chapter-backing` favor.
- `src/simulation/people-goal-pursuit.ts:95 activeGoalFor` (a person's own ambitions).
- `src/simulation/political-belief-formation.ts` (views and their reasons); `src/simulation/decisions.ts evaluateDecision`.

## What to change

1. **Movement = an organization plus its followers, no new store.** Add `movementOf(world, personId)` in `living-world/party-evolution.ts` (or a sibling `movements.ts` in the same folder that imports it): returns the party unit or cause organization the person founded or leads (`leader:*` participation), its members, its platform (`partyPlatformAt`, or for a cause group the law/question it formed around), and its following (members + people whose recorded views cite the leader as a reason in `political-belief-formation`). A "following without an organization" is allowed: if a person has no organization but many people's view reasons cite them, the reader returns a following with `organizationId: null`. Founding a cause group or party by the player uses the existing `founding` initiative; do not add a second founder path.
2. **Leadership passes by the members' own decision.** When a leader dies, retires from play, or steps down (new `stepDownFromLeadership` command writing the participation end), schedule one body decision through `recordPartyBodyDecision` (cause groups get the same call; generalize its input from party-only to any organization with a body). Candidates: living members and close ties of the old leader (kin, mentorship bonds via `meaningfulBonds`, long collaborators). Each member votes with `evaluateDecision` from: closeness of the candidate's recorded positions to the platform, their relationship to the candidate, the candidate's relationship to the old leader, and their own temperament. No similarity score threshold: the considerations decide. The winner's own goals (`activeGoalFor`) stay theirs; their later stances keep coming from their own belief formation.
3. **Followers stay, drift or leave.** After a leadership change, each member's next scheduled membership review (`party-evolution` body review cadence, `:1765 scheduleBodyReview`) weighs the new leader instead of the old one. A member whose reason for belonging was the old leader personally may leave; one who belonged for the cause stays. Written as ordinary participation state changes; nothing on a daily tick.
4. **Implicit protégés.** New reader `inferredProtegeOf(world, observerId, personId)` in `person-context.ts` (beside its mentorship read at :613): an observer infers a protégé from interactions they witnessed or heard of (shared events, campaign help, appointments, introductions) where the elder brought the younger along repeatedly. Others then treat the protégé with a share of their standing toward the elder through `favorStandingBetween`; the protégé never sees a label, only how people treat them.
5. **Life after office.** When a person leaves their last office (term end without re-election, `another-term` decides not to run, or a loss), they keep producing: (a) endorsement asks from candidates who know them, answered by `evaluateDecision` from agreement and relationship (a favor record is written ONLY when the giver's reason is reciprocity, per favors.ts header); (b) appointment eligibility via `appointmentCircle`; (c) reporter calls via the existing press interview producers; (d) campaigning for a candidate through the existing campaign activity path. For the player these surface through Session 4's scene system as asks and invitations; for NPCs they run in the background at the moment a campaign or vacancy needs them.
6. **Heir standing and movement.** Use queued Q5 part 3 (heirs inherit: partial family knowledge and `inheritedFavorWeight`) for knowledge and favors. This spec adds only: if the successor the player picks also becomes the movement's leader through part 2, the movement's members and their standing toward the movement come with the leadership; no separate copy.

## Must NOT build

- A "legacy points", movement strength meter or similarity percentage that decides who inherits.
- A fixed retirement age, a fixed share of followers who stay, or any draw.
- A parallel party or organization system; movements are organizations plus readers.
- Automatic inheritance of leadership by blood: a child leads only if the members choose them.
- Endorsements as automatic favors-for-votes trades.
- Copying the dead person's relationships onto the successor (Q5 part 3 handles weaker inherited standing).
- Authored "elder statesman" event scripts; daily ticks over former officials.

## Done when (proof in a played game)

- Random place, observer run 20+ years: at least one person founds a cause group or party, leaves office, is asked for an endorsement and gives or refuses it with recorded reasons, and later dies; the organization's body decision picks a successor with each member's considerations visible in the dev trace; some members leave citing the old leader.
- Player run: player founds a cause group, recruits members, retires the character; continue as a child; the child becomes leader only if the members' decision says so; the person page shows the movement and its new leader; b19's look-back names who carries the cause.
- Tests: `movement-succession.test.ts` (same world, same leader death → same successor; changing one member's relationship changes their vote, not a random flip); `inferred-protege.test.ts` (an observer who saw repeated co-attendance treats the younger person better; one who saw nothing does not); `after-office-endorsement.test.ts` (an ex-officeholder's endorsement decision cites agreement/relationship; no favor written unless the reason is reciprocity).

## Depends on

- Queued Q5 part 3 (heirs inherit knowledge and favors) and Q1 part 6 (primary challengers from the record) for the career arc.
- Session 25 part 5 (parties drift, split, merge from members) — movements reuse that body-decision path; coordinate so there is one.
- Session 4 scenes for the player-facing asks; Session 13 for elections.

## Open questions for the owner

- When you retire a character from play but they are still alive, should they keep leading their movement as an NPC until they die or step down? (a) Yes, they keep leading and act on their own; (b) leadership passes at once, as if they stepped down.
