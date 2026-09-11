# CIVIL-AUTHORITY13: supported public-personnel decisions

Continues the merged CIVIL-WORK7 checkpoint (#154) under BUILD-OUT7 section C
and RETURN13 backlog item 6. The contract is in
[Public personnel](../systems/public-personnel.md), and the plan is
[civil-authority13](../plans/active/civil-authority13.md).

## Entry pins

| Input                                   | Head                                                               |
| --------------------------------------- | ------------------------------------------------------------------ |
| Main at entry                           | `95e34ed5779ac76f20acd3da5e537d716931e669`                         |
| CIVIL-WORK7 merge                       | `9f9ce18c019208d57e75cfcd74fb86db315e879b` (#154)                  |
| UI owner #144 (mount already present)   | `302e1f0cb3fb6c7d5823c41cf9b5bf87d2bfcac2`                         |
| Civil-service corpus digest (unchanged) | `9d63e5a66a1e4dcc9e08311b62c167818f705737779432a25dc17fb67dfd5c1f` |

The completed source audit was not repeated. No lock, raw byte, domain fact or
domain validator changed. No new instrument was acquired.

## What is playable

These run end to end on canonical people, work relationships, events, evidence,
knowledge, scheduled time and Work, and they survive snapshot reload. The
perspective is Minnesota state classified service, playing as an agency's
designated appointing authority:

1. A real 30-minute informal resolution meeting with the employee (§ 43A.33,
   subd. 1).
2. A reprimand or discharge for one of the four named just causes, with
   specific reasons. It needs a permanent classified employee not covered by an
   agreement, and it produces written notice evidence the employee receives and
   knows about. A discharge ends the LIFE employment. The notice carries the
   30-calendar-day appeal statement.
3. Filing the notice with the commissioner, by any current appointing
   authority of the employer. A Work item tracks it, and a late filing is
   recorded as late.
4. The employee's own decision to appeal to the Bureau of Mediation Services,
   made once by the NPC on receiving the notice. It is either a pending appeal
   or a final decision not to appeal; the director chooses neither when nor
   whether.
5. The chapter 43A commissioner's decision whether the authority must settle,
   made once by the single NPC holder of that office when the appeal arrives.
   If nobody held the office then, a party may refer the appeal later. The
   settlement terms and the hearing remain unavailable.
6. A direct reinstatement offer to a former permanent or probationary employee
   of the job class within four years. The person answers once per employer
   through the NPC decision architecture; a decline stands, and an offer the
   position can no longer honor lapses. Probation is available only for former
   employees of a different appointing authority. Acceptance creates a real
   LIFE employment and incumbency; pay is not invented.

Seeds used by the tests exercise both sides of every NPC choice (appeal or
not, settlement directed or not, reinstatement accepted or declined).

## Refusals (field-local; each names its missing instrument)

- Wrong authority: relatives, other agencies' directors, the commissioner, the
  employee, and a charter on a real or non-agency organization.
- Wrong class or tenure: agreement-covered (§ 43A.33, subd. 3(a)), probationary
  (subd. 3(c)), unclassified or unknown class.
- Wrong date: before the 2026-09-06 observation. Wrong jurisdiction: Alaska
  (AS 39.25.150(15)-(16) rules), federal (§ 7511, OPM, agency official),
  Nebraska and all others.
- Procedure: no informal attempt, an unnamed ground, suspension or demotion, a
  reused meeting, late appeal, duplicate filing, appeal or decision, and a
  second reinstatement answer.
- Reinstatement: never employed in the class (kinship does not help), lapsed
  beyond four years, occupied position, self-appointment, and probation for
  the same appointing authority.
- Blocked transitions: classified selection and appointment, probation
  completion, arbitration list, selection, hearing and award, all Alaska
  employer actions and board decisions, and all federal actions.

## Normal-play reachability (not delivered)

Ordinary play creates no civil-service position and no designated authority.
Classified selection is blocked by missing instruments, and no producer seeds
pre-existing public employment. So these transitions are proven through an
explicitly authored diagnostic scenario (`tests/e2e/support/civil-authority-world.ts`),
not through a normal new game. To reach them, one of two things must happen:

- **OPENING or CAREER** seeds authored public employment through
  `establishPersonnelDesignation`, `establishPersonnelPosition` and
  `establishPersonnelIncumbency`; or
- **acquisition** of the Minnesota commissioner's plan and selection instruments
  lets appointment itself become supported.

## UI integration

No root or navigation change is needed. PR #144 already mounts
`<CivilPersonnelPanel world onWorldChange />` in the Work sections at
`src/player/PlayerGame.tsx:2818` and `:2900` (at `302e1f0c`). The signature is
unchanged. The optional `transitionHandlers` prop defaults to
`createCampaignElectionTransitionRegistry()`. With no personnel records, the
panel renders exactly the earlier preparation view, so existing normal-route
tests are unaffected. The UI owner may pass the root's registry for
consistency; nothing else is required.

## EXEC and LIFE

- `publicEmploymentPermissionProvider()` is now a real, world-aware LIFE
  provider for `work:public-discipline`, `work:public-remove` and
  `work:public-reinstate` on named records. It replaces the unused
  class-context signature.
- `executiveOfficeStaffBoundary(jurisdictionKey, date)` is the sourced input
  EXEC kernel 92H-K-022 lists as missing: Minnesota governor's-office staff are
  unclassified and Alaska's are exempt. It states that appointment and removal
  authority are not established. EXEC owns wiring it into the kernel bank; this
  branch does not edit EXEC files.

## Design decisions for review

1. **Authored-charter authority.** A fictional state agency's charter can name
   its appointing authority. This is game-authored fiction, labeled as such and
   restricted to authored `service:state-agency` organizations. The alternative
   is literal statute only, which would leave no employer-side transition
   reachable, because the acquired text never names any agency's appointing
   authority.
2. **Procedures live in the consumer projection, not the domain.** This keeps
   the accepted domain schema and digest stable and avoids a source-pin cascade
   across open branches.
3. **The observation convention matches the qualification consumer.** Current
   text supports its observation date and later ones. PR #154's
   exact-date-only rule is replaced.
4. **NPC counterparts, not control switching.** Work integrity makes control
   switching invalid, so counterpart choices go through the decision
   architecture. They are made on receipt, not on the player's request, so the
   player cannot time or withhold them. The employee-reply writer was dropped:
   no single-perspective world could reach it.
5. **An independent adversarial review** found three blockers before
   publication. The director could time or withhold the appeal decision, a
   re-offer could reroll consent, and integrity accepted tampered outcomes.
   All three are fixed with regression tests. It also found a stranded open
   offer, a stale form selection, unbound numeric terms and a former director
   filing; all are fixed.

## Verification

See the PR body for the exact tested head, commands and results.
