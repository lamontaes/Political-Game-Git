# C119B scene grounding audit

Status: local repair verification passed; exact-head CI and independent C119C acceptance pending.

## Accounting and runtime availability

The research inventory remains 62 IDs: exactly 16 distinct implemented/authored
kernel IDs, with 46 research kernels deferred outside this wave. All 20
registered scene/packet/static-output/review triplets remain. Ten authored
stages are now **withheld at runtime**. That is an availability restriction
within the existing sixteen, not ten newly deferred research IDs or a claim
that all sixteen kernels are currently playable.

## All twenty triplets

| Stage                | Standing evidence or continuation                                                                                | Immediate scene / disposition                                                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cubby-space          | Age 5, enrollment, dependent child                                                                               | Hook and coat encounter authored now; recorded in the ordinary resolution event.                                                                                                       |
| partner-pairing      | Age 7, enrollment, dependent child                                                                               | Pairing, work and visible attention authored now; same event. No persistent new pupil is fabricated.                                                                                   |
| recess-race          | Ages 6–7, enrollment, dependent child                                                                            | Race, witnessed fair start and response authored now; same event.                                                                                                                      |
| tattle-boundary      | Ages 6–7, enrollment, dependent child                                                                            | Quiet-work/window encounter authored now; same event. Unsupported adult-silence clause removed.                                                                                        |
| it-was-still-there   | Same-instance earlier stage, at least 180 days, current enrollment, child under 9                                | New quiet-work encounter; neither same enrollment nor unchanged rule asserted. Earlier action is not invented or restated.                                                             |
| chore-resistance     | Ages 5–6, shared household, canonical guardian, dependent child                                                  | Blocks and guardian request authored now; same event.                                                                                                                                  |
| parent-exhaustion    | Ages 6–7, shared household, canonical guardian, dependent child                                                  | Visible posture and immediate encounter authored now; no diagnosis, cause or prior work asserted.                                                                                      |
| sibling-toy-snatch   | Ages 5–7, shared household, actual household peer under 5, dependent child                                       | Immediate toy encounter authored now; same qualifying younger person in prose.                                                                                                         |
| best-friend-pact     | Ages 6–7, dependent child, familiar non-kin/non-household person aged 5–8, birth dates less than two years apart | Proposed pact authored now; no claim that familiarity proves a long shared biography. The birth-cohort filter applies before the stable instance ID and cast are chosen.               |
| across-the-checkout  | Same persistent cast/instance, earlier say-yes, at least 2920 days, age at least 17                              | Current recognition/checkout encounter authored now. Callback recalls the recorded agreement; no “as kids” biography, intervening friendship, or claim about the other's memory.       |
| called-in            | Work and enrollment are insufficient                                                                             | WITHHELD: no bound supervisor request, shift, coursework or evening conflict.                                                                                                          |
| asked-by-a-colleague | Shared workplace is insufficient                                                                                 | WITHHELD: no actual coverage request or known funeral reason.                                                                                                                          |
| it-came-back-round   | Prior yes and 90 days are insufficient                                                                           | WITHHELD: no performed help, current coverage need or rota.                                                                                                                            |
| pooled-tips          | Job and colleague are insufficient                                                                               | WITHHELD: no tipped/pooling arrangement, cash removal or direct witness.                                                                                                               |
| what-you-said-stuck  | Earlier statement and 120 days are insufficient                                                                  | WITHHELD: no continued discussion, identified questioner or linked knowledge.                                                                                                          |
| the-commute          | Enrollment and work are insufficient                                                                             | WITHHELD: no transit mode, journey duration, timetable or shift conflict.                                                                                                              |
| carrying-the-group   | Enrollment and familiar person are insufficient                                                                  | WITHHELD: no shared course/assignment, deadline or contribution record.                                                                                                                |
| the-family-shop      | Kinship is insufficient                                                                                          | WITHHELD: no family business/work context or unpaid weekend request.                                                                                                                   |
| the-third-weekend    | Earlier yes, elapsed time and relative are insufficient                                                          | WITHHELD: no specific continuing commitment plus work/performance evidence. Removal or ending of a commitment cannot unlock it. “Two months in” and relative ownership claims removed. |
| sandbag-line         | Generic active incident is insufficient                                                                          | WITHHELD: no relevant flood kind, affected local place, actual sandbag activity or participation context.                                                                              |

## Evidence boundary

An immediate proposed childhood encounter is distinct from asserting an
existing job arrangement, disaster, completed work, or shared biography. For
the ten retained moments, `recordSceneContext` preserves the immediate proposal
in the existing event's `context.pressure` alongside its selected action,
participants, date, direct knowledge and memory. Merely projecting eligibility
writes nothing. No standing records are fabricated to qualify prose; no new
World store, schema version, clock or domain engine is introduced. Other
accepted stages keep their existing event representation.

The ten withheld packets are explicitly conditional authoring specifications,
not live canonical fact packets. Their old standing gates can no longer offer
or execute those scenes. Their retained static prose and review establish only
packet-to-output fidelity. Removal of withholding requires a later authorized
repair binding the missing canonical evidence, not arbitrary synthetic data.

`playEpisodeOption` recomputes eligibility before committing. A stale or forged
beat cannot bypass withholding or changed actor/cast context. Existing stable
family, stage, option and instance-key formats remain unchanged.

## Review and architecture

The separate civic-prose grounding reviewer checked all twenty exact pairs and
all six classes. It found two unsupported claims (adult silence and recalled
best-friend status); both were removed and the two revised pairs passed fresh
review. The available inherited agent performed this review; the unavailable
pinned Claude reviewer was not run. No PR #99 contract or review parser changed.

Architecture Integrity checklist: no domain duplication, no new record family,
no runtime model, no source-derived occurrence frequency, no political or
institutional engine, no #85/#79 runtime edits, no art or visual redesign.
Prior first-wave audit claims about sufficient standing context and completed
work are superseded by this audit's explicit withholding. M1's frozen #112
ownership test is retained byte-for-byte from main.

LEARN: a matching packet and prose do not prove that runtime evidence supports
the packet. The durable safeguard is an explicit failing eligibility condition
with missing-evidence reasons, adversarial tests, and separation of authored
kernel accounting from playable availability. Selection is rechecked at the
write boundary; age-qualified cast identity must be chosen before computing
its persistent instance key.

## Local verification

- Full `npm run validate`: 137 test files, 2,405 tests passed; formatting, lint,
  typecheck, source validation/replay, build, deterministic demo and art
  validation passed. An earlier run exposed a withholding-requirement adapter
  key-prefix mismatch; the adapter was fixed and the complete suite rerun.
- Focused content/adapter/grounding: 88 tests passed, including 17 new
  adversarial tests. Existing narrative/history play proofs passed both focused
  and full-suite runs.
- Browser proofs: 19 narrative/content-browser cases plus one new pointer,
  Enter and Space activation case passed on an isolated port. Automated browser
  success does not constitute human visual or content acceptance.
- All 20 deterministic grounding checks and all 20 reviewer-verdict checks
  passed; fresh separate semantic review passed after two bounded omissions.
- `npm run inventory:art`: inventory unchanged, 322 items. `npm run qa:art`
  generated the contact sheet/report successfully. No art bytes were changed.
- `git diff --check` passed. Main's canonical M1 ownership file has zero diff.

No known repair defect remains from local checks. Ten unsupported authored
stages remain deliberately withheld. C119C, owner acceptance and final CI are
not implied by the local results.
