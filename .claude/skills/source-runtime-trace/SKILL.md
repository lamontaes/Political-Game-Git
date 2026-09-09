---
name: source-runtime-trace
description: >
  Trace a Political Game sourced fact from locked evidence through normalized
  status, adapter, canonical World state, and player consumer. Use for real-world
  source additions, source-status reviews, or claims that sourced data affects
  play; do not use for deliberately fictional authored content or unsourced
  design speculation.
---

# Source-to-runtime trace

Read `docs/systems/source-substrate.md`, then the specific domain system document
and implementation. Source is evidence; the World is canonical truth. Reuse the
existing source commands and validators.

## Bounded workflow

1. Run `$project-operations` preflight and name the exact fact/proposition and
   intended player consumer.
2. Trace one explicit chain:
   - raw artifact URL, retrieval status, rights, digest, and lock entry;
   - normalized corpus record and proposition-level citation;
   - value state (`KNOWN`, `HISTORICAL`, `NOT_YET_OPERATIVE`, `CONFLICTING`,
     `NOT_APPLICABLE`, `NO_REQUIREMENT_FOUND`, `SUPPRESSED`, or `UNKNOWN`) and,
     when applicable, release status;
   - named one-way adapter and its omissions;
   - canonical World write/read seam;
   - actual normal-player consumer and reachability test.
3. Keep identity, authority, operative status, and release status separate.
   Never coerce missing/conflicting/suppressed data to zero or infer powers,
   eligibility, outcomes, or current truth from place identity.
4. Run `npm run source:verify-artifacts`, focused domain tests,
   `npm run source:validate`, and `npm run source:replay` as appropriate.
   `source:acquire` is the only networked command: run it only when acquisition
   is explicitly authorized and the domain plan/rights/storage are declared.
5. Report every link in the chain and every intentional omission. A compiler,
   fixture, or developer route is not proof of a normal-player consumer.

Deliberately fictional programs or content remain allowed when they are clearly
authored and labeled; this skill prevents them from being misrepresented as
sourced facts. Unknown facts remain unknown.

## Stop condition

Stop on unlocked or hash-mismatched bytes, unknown rights for a production input,
an unresolved/conflicting operative value, a production gate, missing adapter,
fixture-only evidence, or an absent player consumer. Report the truthful highest
completed link instead of claiming end-to-end implementation.
