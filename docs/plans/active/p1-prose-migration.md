# P1 prose migration — narration and thread scaffolds

Owning authority: Drive packet `P1-PROSE-01 — Narration and Thread Migration on
Post-#125 Main — 2026-09-07`, under `PROSE-RESET — CURRENT-MAIN PLAYER-FACING
LANGUAGE MIGRATION PLAN — 2026-09-07`. Base: `origin/main` at
`e9f9b2918c184c1e031cd9af8f6175568c601716` (the PR #125 merge).

Scope is narration and thread player-facing language only: the computed
`connective` and `thread-recap` banks in `src/presentation/life-narration.ts`,
the narrow NO-PROSE policy for quiet periods, and the tests, corpus artifacts
and documentation those changes directly require. Simulation semantics
(`src/simulation/narrative-threads.ts` and everything beneath it), the #125
corpus identity/versioning machinery, and the #99 prose contract/tooling are
preserved, not rewritten.

## Source map — from the #125 inventory on the base SHA

The current-main inventory (`npm run corpus:prose` on the base SHA) holds 1,872
templates. The P1 slice is the two computed banks of
`src/presentation/life-narration.ts`, all PLAYER_REACHABLE:

- `connective` bank (49 rows): symbols `composeConnectiveNarration` (8),
  `elapsedPhrase` (9), `steadyState` (20), `quietSentence` (11), `listOf` (1).
- `thread-recap` bank (29 rows): symbols `recapSentence` (16),
  `threadMovementSentence` (13).

78 rows in total. Baseline lint warnings inside the slice: 11 (all
`vague-referent`).

Rows that resemble P1 but are deferred:

- `src/presentation/life-introduction.ts` `connective` rows (8): the life
  introduction is an opening scene surface, already concrete
  ("You started {label} at {name} in {year}."), and belongs to the P2
  ordinary-scene wave. Not touched.
- `callback` bank (`src/simulation/life-callbacks.ts`, 30 rows): simulation
  return summaries; rewriting them is a P2/P3 content wave and touches a
  simulation module. Not touched.
- Campaign/legislative/conversation status surfaces: P5/P6. Not touched.

## Dispositions

Classification per packet Phase 1C. Every changed or suppressed row is listed
with its stable semantic key (the `computed-anchors.json` anchor inside
`src/presentation/life-narration.ts`); the differential corpus report carries
the resulting `reworded` / `addedSites` / `removedSites` transitions.

### 1. Record-grounded narration to rewrite

- `composeConnectiveNarration-*`: elapsed opener and age clause stay (dates and
  a crossed birthday are canonical), wording tightened.
- `threadMovementSentence-*`: rewritten from thread family + canonical anchors;
  vague or interpretive forms ("Something at {subject} happened worth
  remembering.", "The money side of it moved, and not by itself.", "The
  aftermath of it ran on longer than the thing itself did.") replaced with
  plain record-grounded statements or suppressed where the record cannot name
  the subject (incident, unnamed organizations).
- `steadyState` household/commitment lines: kept, made concrete (named
  residents, the commitment's own label) and stripped of invented texture
  ("and most of them were quiet").

### 2. Elapsed-time filler that becomes NO PROSE

- A quiet interval with no thread movement and no birthday emits no prose at
  all. This retires the steady-state rotation on bridging narration and the
  season-only bridge as a standalone line.
- Retired steady-state atmosphere (removedSites):
  `steadyState-0009` "Life went on at the same pace it had been going.",
  `steadyState-0010` "Most weeks were built around school.",
  `steadyState-0013` "The meetings kept on, about once a month, and mostly
  dull.", `steadyState-0015` "Work stayed work — the same shifts, the same
  people, the same drive there.", `steadyState-0020` "{place.displayName} went
  on the way it does, and so did you."
- The steady lines that survive do so only on the opening surface, where they
  introduce standing facts, and only when a canonical name grounds them.

### 3. Thread recaps whose subject can be named

- Person threads (household / kin / companionship / care / promise-callback):
  the title is a canonical person name; recaps name the person and the
  canonical standing (a due follow-up, recorded movement) without inventing
  content.
- School / work / civic / political threads whose organization has a recorded
  profile name; promise threads carrying the commitment's own label.
- Money threads whose obligation record has a `housing:` / `debt:` /
  `support:` / `care:` basis: the recap names the payment class from the
  record.

### 4. Thread recaps that are suppressed as under-grounded

Suppression = `openThreadRecaps` / thread movement narration skips the thread;
no generic sentence is emitted in its place.

- Incident threads (`recapSentence` incident arm, `quietSentence` incident arm,
  `threadMovementSentence-0003`): the incident record carries only machine
  semantic keys; the subject cannot be named safely.
- Work / school / civic / political threads whose organization has no recorded
  profile name (the old fallback titles "Work", "School", "Something in the
  neighbourhood").
- Promise callback threads with no nameable counterpart (the old fallback
  title "Something decided earlier").
- Money threads with a `custom:` basis.

### 5. Deferred rows

Listed above (life-introduction, callbacks, P5/P6 surfaces). Also out of
scope: reclassifying the 2,786 NEEDS_CLASSIFICATION coverage candidates.

## Behavioral contracts added as tests

- No filler narration merely because time advanced (quiet, birthday-less gap
  → zero sentences).
- A canonical state change still produces concise narration.
- A thread with a supported subject names that subject; no invented facts.
- An under-grounded thread recap is suppressed, not rendered generically.
- Second-person player narration remains intact.
- Prose migration does not change time progression or thread state.
