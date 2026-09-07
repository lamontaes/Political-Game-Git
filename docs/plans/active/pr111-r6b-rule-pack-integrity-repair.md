# PR #111 R6B Legislative Rule-Pack Integrity Repair

Status: active

## Scope

- Merge current `main` into `claude/legislative-rule-packs-r6` with an ordinary merge.
- Make rule-pack identity validation reject a mismatch between the pack id's state segment and `jurisdictionKey`.
- Represent formal chamber seat counts as explicit known/unknown evidence and require legal consumers to fail closed on unknown counts.
- Carry Nevada's formal counts as unknown and repair the bounded Maryland, Missouri, and Ohio provenance/gap text identified by R6B.
- Add adversarial coverage without adding states or redesigning the legislative model.

## Verification

- Focused rule-pack matrix and origination tests, including adversarial relabel/count cases.
- Full `npm run validate`.
- `npm run source:validate`, `npm run source:replay`, and `git diff --check`.
- Re-fetch the remote branch before publishing, push without force, and require exact-head CI success while PR #111 remains draft and unmerged.

## Completion Record

To be filled with the exact published SHA, validation commands, CI state, remaining defects, acceptance state, and the smallest durable LEARN update.
