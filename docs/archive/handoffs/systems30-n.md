# S30-N frozen return

Owner checkout: `/private/tmp/pg-systems30-n`; branch `codex/systems30-n`.
Base: `e5429fb624adb81e846d636f75fa52bf07f57e09`.
Refetched upstream on 2026-09-13: `68f661665ded130c0154edb408be2a11342b78c3`.
The paused detached source checkout and its two modified evidence images were
preserved. No shared PlayerGame or opening-officeholder source was edited.

## Receiver and current capability

| Boundary                            | Current implementation and remaining input                                                                                                                                                                                                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sourced rules                       | NARA 2020-census 2024/2028 allocation and dated constitutional/count/term rules; other cycles refuse. See `docs/systems/national-elections.md` for exact sources and source date.                                                                                                                           |
| Registered domain                   | Optional append-oriented national election/result/certification/ballot/count/choice/qualification/term histories, stable IDs, chronology and snapshot validation.                                                                                                                                           |
| Actual producer entry               | `scheduleNationalUnitContest` binds existing contest scheduling; the current campaign registry imports supplied canonical results during ordinary time advance. Missing national results block rather than invoking seeded placeholder outcomes.                                                            |
| Actual count consumer               | `scheduleNationalCount` uses the existing due-item registry. Missing certification/ballots/objection resolution block; no partial count becomes a final outcome.                                                                                                                                            |
| Actual office consumer              | `planNationalOfficeTerm` plus a supplied actual `qualifyNationalOfficeEntry` feeds ordinary day/minute advancement and canonical organization/work entry and expiry. President and VP have distinct outcomes, work kinds and occupation classes.                                                            |
| Feature screen                      | Read-only `NationalElectionResults`; supplied factual counts, certification/allocation/count/choice/possession remain distinct. No media projection is supplied.                                                                                                                                            |
| Ordinary entry / installed delivery | A owns root mounting and the opening-holder reader. `systems30-n-root-adapter.patch` is the minimal receiver patch, checked against the refreshed upstream; it is not installed by this feature owner.                                                                                                      |
| Exact next missing inputs           | Presidential campaign filing/nomination/ballot-access and all-unit result producers; certification/elector receivers; canonical congressional membership and lawful contingent choice lists; sourced/authored qualification and oath disposition. No invented congressional story roster or automatic oath. |

The presidential office reference reuses the current federal executive rule pack.
The existing campaign producer, campaign committee, funding and qualification
writers are preserved. No separate previous presidential electoral resolver was
found in the scoped current-source and all-ref recovery pass.

## Verification state

Final frozen-source checks are pending. Earlier focused regression verification
passed 65 tests before the final linked-unit adapter changes. Later serial runs
encountered host-pressure timeouts in unchanged direct campaign/election tests as
well as national tests. Early typechecks and targeted lint passed before the last
edits; these are historical evidence, not final-head claims.

Two browser attempts failed: the first fixture used unavailable dependency URLs;
the corrected module entry subsequently timed out during severe shared-host
memory pressure and source-identity drift. A fresh frozen-source pointer/keyboard
proof is required. Feature-fixture reachability, ordinary-player reachability,
installed delivery and human visual acceptance are separate; none is inferred
from historical automation.

Architecture impact and LEARN are recorded in the task-specific audit addendum:
raw totals cannot stand in for a lawfully resolved state certificate, immutable
versioned clock/allocation facts are compiled once, and integrity caches are
local to replay rather than durable mutable state.
