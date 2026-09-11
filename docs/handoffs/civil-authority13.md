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
| Main merged most recently               | `4f265ebb7ea4107bc43c6a6204f0337c227c2843`                         |
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
   If no holder able to decide existed then, the decision is shown as not
   represented; no party can trigger it later. The settlement terms and the
   hearing remain unavailable.
6. A direct reinstatement offer to a former permanent or probationary employee
   of the job class within four years. The person answers on receipt through
   the NPC decision architecture, and a decline stands for that employer.
   Probation is available only for former employees of a different appointing
   authority. Acceptance creates a real LIFE employment and incumbency; pay is
   not invented.

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

## Hosted browser failure (run 34639494520): diagnosed and repaired

Tested head `208b1f97`. Repository validation passed (269 files, 4224 tests),
Playwright installed, and then the browser step failed before running any test.
Playwright collected **0 tests in 0 files** because Node's ESM loader refused
`src/simulation/civil-personnel-sources.json`: it "needs an import attribute of
type: json". This was not formatting or flakiness, and the defect was mine.
`world.ts` imports `civil-personnel-integrity.ts`, which imported that JSON, so
every spec that loads the simulation died at collection. The earlier local runs
executed only the two component specs, which never load the simulation in Node.

Repair (`ae81516f`):

- The projection is now emitted as the typed module
  `src/simulation/civil-personnel-sources.generated.ts`, following the
  `office-qualifications.generated.ts` precedent. Replay is still byte-checked
  by `scripts/compile-civil-personnel.ts --check` and by the source test.
- The generated file is excluded from prose scanning, because it is cited
  evidence, with the reason stated in `SCAN_EXCLUSIONS`.
- A guard test, `civil-personnel-import-graph.test.ts`, forbids any JSON import
  below `world.ts`. A negative control (restoring the old import) makes it fail.
- `playwright test --list` now reports 328 tests in 52 files, where it reported 0.

## Normal-play entry: explicit state-agency Custom Start

The entry reuses the existing OPENING seam, shaped hunk for hunk like #144's
judicial start. A Custom Start token, `startingLife: "state-agency-director"`,
is accepted only on the Custom route, at age 25 or older, with the early years
summarized, in a state whose personnel procedures are compiled (today
`US-MN`). `createNewGameWorld` builds the ordinary production world. It then
calls the feature's own initializer, `initializeStateAgencyStart`, once at
Custom Begin. Nothing calls it from a panel, from Work or on load, and it is
idempotent.

What it authors, all with authored provenance that names it fiction:

- the fictional Northstar Records Service (`service:state-agency`);
- the player's director employment and leadership role;
- a charter making the director the appointing authority;
- four classified positions;
- existing staff: one permanent and not agreement-covered, one permanent and
  agreement-covered, one probationary, and one former specialist who resigned
  in good standing 190 days before the start, leaving a vacancy;
- a fictional holder of the statutory commissioner office.

Their service dates are authored scenario facts. Every personnel procedure
still applies only from 2026-09-06, so a new game on 2026-01-05 shows every
step refused with that reason. Ordinary play then passes time to September.

Shared presentation edits are small and additive:

- `new-game.ts`: the token, the guard and the post-build initializer call;
- `new-game-identity.ts`: the decoder token, so replay links rebuild the start;
- `setup-questionnaire-flow.ts`: questionnaire context maps the token to
  ordinary life, as #144 does for its judicial token;
- `cli/compare-seeds.ts`: the new option.

No `PlayerGame`, `App` or navigation file is edited.

The panel shows only supported actions as available. Every vacancy lists "Fill
by competitive selection" as unavailable, with the missing instruments named.
Probationary staff show "Complete probation" as unavailable (§ 43A.16).
Everyone shows "Suspend or demote" as unavailable. Agreement-covered staff keep
the § 43A.33, subd. 3(a) refusal. Direct reinstatement appears only once it is
supported.

## UI owner deliverables (#144)

- `civil-authority13-ui-registration.patch`: the creator's "State agency
  director" button, beside the judicial button in the Custom background step.
  It applies cleanly to `302e1f0c`.
- `civil-authority13-start-token-union.patch`: the resolved union of both start
  tokens in the three presentation files. These are the only conflicts when
  this branch meets #144.
- `civil-authority13-normal-route.spec.ts.txt`: the normal-route test.

The panel mount already exists in #144 at `PlayerGame.tsx:2818` and `:2900`.

In a disposable composition (#144 `302e1f0c` plus this branch's diff plus the
patch, head `29658287`), the normal-route test passed. It walks the real
creator: Custom → Minneapolis, MN → State agency director. It checks the
January refusals, passes ordinary time with the player's own controls, holds
the meeting, discharges by keyboard, files, then saves, reloads and continues
with the state restored. #144's creator, judicial-start and component specs
passed alongside it: 13 of 14.

Two findings belong to the UI owner and are not caused by this branch:

- `ui-core-feature-adapters.spec.ts` "mixed person, session and measure pins"
  fails identically on untouched `302e1f0c`: the story section intercepts
  pointer events on scene-person tokens.
- At 390 px, the Day overlay's opening paragraph intercepts the story's "Let
  time pass" button, so narrow-viewport time passage stalls. At 1440 px the
  route works and nothing overflows horizontally.

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
5. **Independent adversarial review and re-review.** The first pass found
   three blockers before publication: the director could time or withhold the
   appeal decision, a re-offer could reroll consent, and integrity accepted
   tampered outcomes. It also found four lesser defects. The re-review
   confirmed those fixes and found the same timing flaw in reinstatement
   answers, a party-only referral path, a decision-key collision and a
   forgeable lapse. All are fixed with regression tests. Every counterpart
   decision now happens on receipt.
6. **Non-author check of the final consequential fixes.** A fourth
   read-only pass ran probes against `6da3a5a6` and verified three areas:
   - the per-employer offer key and the single-write answer: 0 of 30 seeds
     changed their answer across positions or probation choices, and a save
     with an unanswered offer is refused on load;
   - the generated-TypeScript projection;
   - the Custom Start: it is reachable only through `createNewGameWorld`; it
     is refused for a non-Minnesota place, a normal start, age 24 and
     formative depth; no step is available before 2026-09-06; it is
     idempotent; and saves round-trip byte-identically.

   It found no blocker and no major defect. Both minor findings are fixed. The
   import guard now walks from every Node-loaded Playwright spec, the config
   and the global setup, reading imports after TypeScript's type-only
   elision; a negative control trips it. The vacancy step now names a
   standing decline or an uncompiled state instead of "no candidate".

   The pass also noted, without testing, that integrity does not tie an
   authored-charter designation to the Custom Start event. A hand-forged save
   could author an agency and charter outside the start. This predates the
   entry. Integrity already restricts charters to authored `service:state-agency`
   organizations, and it grants nothing over a real organization. It is left
   for LAND as a hardening item.

## Verification

See the PR body for the exact tested head, commands and results.
