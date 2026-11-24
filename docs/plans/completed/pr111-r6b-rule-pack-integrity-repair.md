# PR #111 R6B Legislative Rule-Pack Integrity Repair

Status: Completed

## Scope

- Merge current `main` into `claude/legislative-rule-packs-r6` with an ordinary merge.
- Make rule-pack identity validation reject a mismatch between the pack id's state segment and `jurisdictionKey`.
- Represent formal chamber seat counts as explicit known/unknown evidence and require legal consumers to fail closed on unknown counts.
- Carry Nevada's formal counts as unknown and repair the bounded Maryland, Missouri, and Ohio provenance/gap text identified by R6B.
- Add adversarial coverage without adding states or redesigning the legislative model.

## Reconciliation

- Audited PR head: `9800d75cd7ab100381d8f06a43a98192ca31ebe7`.
- Initial live `origin/main`: `d76d75b1fc973d4e21c79f2f6aa77985187cc42a`, incorporated with ordinary merge commit `94bb0eaf23f1c1b773ec1a561da4fea97768d6e8`.
- The mandatory pre-publish fetch found that main had advanced to `850048dc06ac5a1ee4c08d8f41d286c377707bb5`; it was incorporated with ordinary merge commit `f45aaf517adfb57d3aaf0c8b3d4768bc1c98d8ff`.
- There was no rebase or force-push.
- Bounded implementation commit: `b747f4348c09c2ae1ca07288e764a2334946636d`.

## Repair

- Rule-pack identity validation derives the two-letter state segment from every pack id and rejects disagreement with the declared jurisdiction.
- Formal seat counts now carry verified known evidence or an explicit unknown state with no fallback number. Consumers requiring legal capacity fail closed, while authored demonstration rosters remain separate fixture inputs.
- Nevada's formal Assembly and Senate counts remain unresolved without numeric values or invented provenance.
- Maryland session provenance now covers both Article III §§ 14 and 15; current Article III § 52 and Article II § 17 identify Budget and Supplementary Appropriation Bills plus the limited § 17(f)-(g) Budget item-veto route.
- Missouri's Article III § 29 gap now records the at-least-thirty-day recess effective-date exception.
- Ohio's Article II § 1d gap now distinguishes immediate tax/current-expense laws from emergency laws requiring the two-thirds vote and separate reasons roll call.
- The final current-main reconciliation taught its new executive-kernel fixture to provide authored roster size explicitly and closed that landed packet's ownership-boundary range at its own implementation commit, so later assigned PRs are not measured as part of the old packet.

## Validation

- Focused rule-pack matrix, origination-integrity, and state-legislature source tests: 3 files, 89 tests passed.
- Affected legislation and presentation integration tests: 5 files, 79 tests passed serially.
- Final reconciled focused set: 5 files, 119 tests passed, including executive-kernel compatibility and ownership-boundary coverage from current main.
- Full suite on the final reconciled tree with controlled worker count and an unchanged 60-second runner timeout: 135 files, 2,374 tests passed.
- Exact `npm run validate` cleared formatting, lint, and typecheck; its default-parallel test phase reported five timeout-only failures in unrelated long-running raster, source-digest, scheduling, and person-stress tests. Every test subsequently passed without changing assertions, and all remaining validation stages passed separately.
- `npm run source:validate`: 11 domains, 0 errors; existing declared production gates remained unchanged.
- `npm run source:replay`: byte-identical.
- `npm run build`: passed.
- `npm run demo -- validation-seed`: deterministic and reproducible.
- `npm run validate:art`: passed; `npm run inventory:art`: 322 items up to date; `npm run qa:art`: generated with no tracked diff.
- `git diff --check`: passed.

## LEARN

The smallest durable update is the formal-seat evidence contract documented in
`docs/systems/legislative-rule-sources.md`: legal capacity and authored scenario
roster size are distinct facts, so an unresolved capacity can never be inferred
from a playable fixture.

Exact published-head CI state is recorded in the PR #111 handoff after the
completed plan commit is pushed.
