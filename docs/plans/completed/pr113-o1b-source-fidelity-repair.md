# PR #113 O1B source-fidelity repair

Status: completed

## Scope

This same-branch repair merged current `main` with an ordinary merge and
changed only the municipal source/rule-pack lane. It added no gameplay,
candidacy, campaign, player-facing, or PR #85 coupling.

## Result

- Pinned the exact 278,664-byte 92O Drive snapshot in a deterministic gzip
  container and recorded the uncompressed SHA-256.
- Added deterministic Markdown-to-JSON compilation and byte-identical municipal
  replay, invoked separately by `npm run validate`.
- Replaced all 153 placeholder direct-democracy citations with the instrument
  text carried by 92O and made placeholder/malformed citations fail closed.
- Preserved recall form/charter/local-adoption conditions, runoff local choice,
  non-scalar thresholds, structured `None%` values, and the Maine base conflict
  without manufacturing one statewide scalar.
- Preserved the four 92O section 7 frontier items verbatim and separately from
  the ten implementation-discovered compiler conflicts.
- Retained the existing no-consumer boundary.

## Validation

- `npm run agent:preflight`: passed before editing.
- Focused municipal tests: 39 passed.
- `npm run format`, `npm run lint`, and `npm run typecheck`: passed.
- `npm run source:validate`: passed for 11 registered domains.
- `npm run source:replay`: byte-identical.
- `npm run municipal-election:replay`: byte-identical from the pinned 92O
  snapshot.
- `npm run build`, deterministic demo, `npm run validate:art`, and
  `git diff --check`: passed.
- A local standard full-suite run reached 2,327 passing tests but several
  unchanged 5-second tests timed out while multiple other repository test and
  browser jobs saturated the host. The scoped failures were corrected and the
  focused suite reran green; exact-head CI on the clean GitHub runner remains
  the authoritative unmodified full-validation gate.

## LEARN

Drive-derived research artifacts need their own pinned bytes, digest, parser,
and explicit replay command before any validation report can call them
deterministic. A non-empty citation check is insufficient; placeholder labels
must be rejected as a class. Both lessons are encoded in executable validation
and adversarial tests rather than in prompt text.
