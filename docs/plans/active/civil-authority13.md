# CIVIL-AUTHORITY13 — supported public-personnel decisions

Authority: owner task CIVIL-AUTHORITY13 (2026-09-11), continuing BUILD-OUT7
section C over the merged CIVIL-WORK7 checkpoint (#154). RETURN13 backlog item 6
keeps public personnel open work; this plan is its implementation owner.

## Entry state

- Worktree `/Users/lamontae/Documents/PG-CIVIL-AUTHORITY13`, branch
  `claude/civil-authority13-public-employment`, from `origin/main`
  `95e34ed5779ac76f20acd3da5e537d716931e669`. No equivalent open PR.
- UI owner PR #144 head `302e1f0cb3fb6c7d5823c41cf9b5bf87d2bfcac2` already mounts
  `CivilPersonnelPanel({world,onWorldChange})` in Work. This branch keeps that
  signature, so no root or navigation edit is required.
- The completed P1A/92P source audit is not repeated. The domain corpus, its
  locks, validator and digest `9d63e5a6…` are unchanged.

## Design

1. **Procedure transcriptions.** The consumer adapter reopens the same locked
   civil-service artifacts and verifies each declared excerpt against the
   normalized bytes before projecting a procedure. A changed byte or excerpt fails
   the projection replay. Procedures are `CURRENT_OBSERVATION` on the retrieval
   date and apply only on or after it, matching the accepted qualification
   consumer. No effective interval is invented.
2. **One personnel record family** (`history.personnelRecords`) holds
   authority designations, authorized position slots, incumbencies, informal
   resolution attempts, disciplinary actions and notices, replies, commissioner
   filings, appeals, settlement decisions and reinstatement offers and responses. Every
   record pairs with an ordinary event. Employment itself stays the LIFE work
   relationship; no second employment engine.
3. **Authority is never inferred.** An actor may act only through an active
   designation whose basis is either a transcribed provision naming the office
   or an explicitly game-authored charter of an organization created with
   authored provenance. Titles, kinship, friendship, leadership labels and
   bargaining rights grant nothing.
4. **Civil and labor stay separate.** Position slots carry a civil class and,
   separately, bargaining and agreement coverage. Tenure belongs to the
   incumbency. Unknown values refuse the dependent action only.

## Supported transitions (MN state classified service)

- Informal resolution attempt (§ 43A.33 subd. 1) as a real scheduled meeting.
- Reprimand or discharge of a permanent classified employee who is not covered by
  a collective bargaining agreement. The designated appointing authority must act
  for an enumerated just cause (subd. 2) after an informal attempt. A written
  notice carries the 30-calendar-day Bureau of Mediation Services appeal
  statement (subd. 3(b)).
- Commissioner filing within 10 calendar days (subd. 3(b)), by any current
  appointing authority.
- The employee's own appeal decision on receipt of the notice (subd. 3(b)),
  through the NPC decision architecture; pending, never favorable by default.
- The chapter 43A commissioner's settlement decision (subd. 3(b)) by the single
  canonical holder of that statutory office, made when the appeal arrives.
- Direct reinstatement by an appointing authority of a former permanent or
  probationary employee of the job class within four years (§ 43A.15 subd. 15),
  with the appointee's consent and optional probation (§ 43A.16 subd. 1).

## Blocked, with named missing instruments

Classified selection and appointment (commissioner qualifications,
finalist-pool determination, pay plans); probation completion (plan-defined
duration); probationary and agreement-covered discipline (plans or agreements);
demotion and suspension (class and pay assignment, return scheduling);
arbitrator list, selection, hearing and award (Bureau rules and plan); all
Alaska employer actions (personnel rules under AS 39.25.150(15)-(16)), and
Personnel Board decisions (board constitution); federal actions (§ 7511
coverage, OPM regulations, agency official); Nebraska and the remaining
jurisdictions (no compiled procedures).

## Acceptance

Implementation, focused tests, component browser proofs and the full repository
gate are complete. An independent adversarial review and a narrow re-review
checked the delta. Normal-play reachability is not delivered: it needs a
producer of authored public employment, or the acquired selection instruments.
The [handoff](../../handoffs/civil-authority13.md) records the reasons, and the
plan stays active until LAND and the owner decide. No self-merge.
