# A13 / A38 coverage and catalog closure — proposed receiver delta

Patch: a13-coverage-catalog-closure.patch.
Exact baseline: `3d99f916879c4a903635f92edfa463586d9fd3e9`.
Dependency: receiver's previously applied f7447e87 hourly pay packet and sole coordinator PAY registration.
Existing donor: `aa548369984f66383cd87c37746ed99cdd5a28c5` (#1575).
Patch SHA256: `4f87db89fab47ccd8bfa4b088a13756c637b8a40d3c6753f98185ddfaf5b67a2`, 10,177 bytes.

The artifact branch changes docs only. This four-file portable production proposal does not add A37 monthly logic, annual office pay, registry changes or a second coverage query/guard. It adds no rate, fabricated worker, exception or jurisdiction.

## Exact reused source and hunks

| Path | Existing source / receiving boundary |
| --- | --- |
| src/simulation/pay-coverage.ts | New module copied byte-for-byte from donor blob `f8cee1a33d3a6e65ea5c40c59c3c38459793ff4d`, 196 lines. determineWorkPayCoverage(world, workIds: readonly EntityId[], reason: WorkPayCoverageDeterminationRecord["reason"]): World at donor line 43. initializeWorkPayCoverage(world: World): World at 190. Imports/reexports the previously received sole pay-coverage-query; no duplicated query or validator. |
| src/simulation/life.ts | Base blob `80910d0ed346f032bf1ba9fae7413fa444d410a1`; +24/-3. Donor blob `0353e340fe6d2bbe76ffb412d46bd2211f42f367`: import plus createWorkRelationship post-commit at donor 973–984; createWorkRelationships post-commit at 1090–1105; recordWorkStatus post-append at 1258–1266. Existing helpers/validation/records and unrelated newer main code remain intact. |
| src/presentation/opening-life.ts | Base blob `f3d6bad8b3fe4d59ce7e98687a5635ed25025d5a`; +3/-1. Donor blob `3eb8f08c8b44cb6df499c5d05ac228e04b5a471c`: initializeWorkPayCoverage import line 1 and one call at 378 after the existing openedWorld result, before returning the session. Existing guards and opening order remain intact. |
| src/simulation/demo.ts | Base blob `ca693f572ae10871837a4d63ddd212bcae998ff7`; +3/-0. Same test donor blob `4008c8c57e98e3ad00114330f4748b9c7d377080`: optional CreateScenarioWorldOptions.policyCatalog and comment at 86–87; forwarding into existing createWorld at 157. No job/catalog swap after creation, no fixture assertion change. |

## What the producer actually records

The existing append-only producer iterates requested actual saved relationships, refuses a missing relationship/dated role, and acts only on actual active paid/mixed work with an employer. It binds actual role/status/profile fact IDs and workplace jurisdiction through the existing dated predicate reader. With no recorded workplace, federal authority uses the actual national jurisdiction and state authority is omitted; no home proxy.

The determination retains standard default category, dated current facts, source citations, canonical governing-law keys/origins and existing row predicates' matching fact IDs. IDs are created from the established work-pay-coverage stable key. Existing determinations are not rewritten or duplicated. Hire calls use committed current-date relationships; activation calls use the appended actual current-date active state. Opening initializer calls the same producer once after actual opening jobs/laws are present. Existing integrity runs after append.

The producer is intentionally unchanged; any native mismatch with the received strict guard must be reported with its actual case rather than altering the saved record or weakening integrity.

## Exact ownership/receipt request

- Team 3 retains pay-coverage producer and the previously released life.ts singular/batch creation and actual activation post-write/import hunks. This packet changes only those existing hire/activation boundaries.
- The last explicit opening initializer caller owner is AUDIT/SYSTEMS (01a0f364-0f5e-7172-b8a5-3792039aa0dc). Request receipt/release ONLY the initializeWorkPayCoverage import and wrapping the existing openedWorld result in completeOpeningLife; no whole opening file transfer.
- Coordinator previously owned demo.ts optional policyCatalog option/forwarding repair. Request receipt/release ONLY these two catalog setup boundaries, preserving actual demo jobs and current main changes.
- Coordinator retains registry, world.ts core hooks, existing coverage query/integrity and transfer guard. No further modifications to those surfaces are included. Central claim check before applying the two foreign caller/fixture seams remains with coordinator.

This is a portable proposal for receiver composition; it does not mutate those owners' checkouts.

## Verification and receiving checks

Executed here: exact GitHub donor source/blob reads; 4/4 mechanical diff reconstruction; native git apply --check exit 0 in /tmp/team-3-a13-coverage-closure-3d99 against downloaded base files; native git hash-object confirms all three baseline blobs equal the table. Patch file SHA256/byte count verified. Shared registered checkout remains at parked playtest head 0452b1d3bbf5aef0aa0ef53c896a12297ad954a8 with its prior untracked proof config, untouched by this authoring.

NOT RUN: closure types, producer/hire/opening behavior, the five payment assertions, coverage adversarial integrity cases or official Claude gate. Root's prior 19-root types receipt applies to its earlier candidate, not this four-file delta.

Existing test donors, all at aa548369984f66383cd87c37746ed99cdd5a28c5:
- src/simulation/earned-law-pay-payment.test.ts blob a4a7868481fe84b7556757d186a875b4e6387d27; preserve all five assertion bodies. The catalog is provided before jobs through the optional demo seam.
- src/simulation/earned-law-pay-integrity.test.ts blob f4be98e236f56e2bfc1566553bc9f2f191577c7f; its coverage adversarial cases can now request actual producer-created records through the real existing hire/opening path, rather than synthetic saved coverage.
- src/simulation/completed-hourly-gross.test.ts blob 3aa4c9fa37553bcfae667c4d0ad0099b8ecb0293; unchanged pure gross assertions.

Next: coordinator receives narrow foreign hunks with exact ownership, composes with its 19-path candidate and PAY slot, and routes changed-file type/behavior gate to Claude. Report actual result at the composed pin. Any mismatch is still open until that result; no source/behavior acceptance implied by the native apply check.

Replaces: missing current-main producer/hire/opening and pre-creation catalog boundaries with the already published canonical producer/calls; no parallel coverage engine.
