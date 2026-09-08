# P2 prose migration — ordinary/adult scenes and consequence/memory bank

Owning authority: Drive packet `P2-PROSE-01 — ORDINARY ADULT SCENES + MEMORY
BANK MIGRATION — 2026-09-07`, under `PROSE-RESET — CURRENT-MAIN PLAYER-FACING
LANGUAGE MIGRATION PLAN — 2026-09-07`. Base: `origin/main` at
`b61abf26118e50be351c09db5b3d0823333fc9ec` (the PR #126 merge, containing the
accepted P1 head `1fadfa5`).

Scope is the ordinary/adult scene and consequence/memory corpus only: the
`adult` bank in `src/simulation/adult-situations.ts`, the `callback` bank in
`src/simulation/life-callbacks.ts` (deferred from P1 to this wave by
`docs/plans/active/p1-prose-migration.md`), and the tests, corpus artifacts and
documentation those changes directly require. The P1 narration/thread banks,
the episode banks and their slot grammar (P3), campaign/election prose (P5),
governing/legislative prose (P6), UI/flow, art, and unrelated simulation
semantics are untouched.

## Source map — from the current inventory on the base SHA

The current-main inventory (`npm run corpus:prose` on the base SHA) holds
1,869 templates. The P2 slice, all PLAYER_REACHABLE on the base SHA:

- `adult` bank (382 rows over 35 situations): 35 scene lines, 102 option
  labels, 102 option descriptions, 102 option memories, 41 witnessed lines.
- `callback` bank (30 rows): `RETURN_SUMMARY` family sentences,
  `GENERIC_RETURN`, and the `lifeCallbackTransitionHandler` reason strings.
- `work-item` bank (4 rows, `src/presentation/ordinary-life.ts`): examined and
  left unchanged — both work items are already concrete and dry-institutional.

Baseline lint warnings inside the slice: 128 (vague-referent, and-it-scaffold,
rather-than-scaffold and related families).

## Dispositions (packet Phase 1)

### C — MISSING_CONTEXT / withheld (five situations, 47 rows)

Each fundamentally depends on an object, amount or record the world does not
contain. Withholding is first-class, following the #119 episode-bank seam: a
new `withheld` reason field on `AdultSituation`, never offered by
`availableAdultSituations`, reported by the corpus as `WITHHELD_BY_GROUNDING`
with the bank's own reason. The rows stay authored — their keys stay valid for
saves and scheduled callbacks that already carry them — and no id was retired
or reassigned.

- `adult.household-repair` — the unnamed broken "something"; no object records.
- `adult.household-money-shortfall` — the month's arithmetic; no monthly
  income/spending records (grounded money pressure lives in `adult.debt-call`
  and `adult.housing-cost-change`).
- `adult.unexpected-expense` — a broken object plus an unstated cost.
- `adult.small-windfall` — money with no amount, source or claim records.
- `adult.housing-repair-standoff` — an unrecorded defect and an unrecorded
  repair-responsible counterpart.

Re-adding any of these later behind a real household-object or money-receipt
record is a mechanics lane, recorded here as the exact DEFER boundary.

### A/B — grounded rewrite (30 situations kept)

- `adult.household-standing` regrounded to the canonical errands work item:
  gate now also requires `hasHouseholdWorkItem`, and the scene names the
  shopping and the appointments the record carries instead of "the same
  thing".
- `adult.housing-cost-change` gate tightened to require an active obligation
  with a `housing:` basis (new `hasHousingObligation` context reading), so
  "what it costs to stay" is a recorded payment rather than an assumption.
- `adult.work-extra-hours`, `adult.work-offer-elsewhere`,
  `adult.care-request`, `adult.volunteer-ask`, `adult.incident-aftermath`,
  `adult.weekend-invitation` scene lines rewritten off their
  "thing/somebody/week" scaffolding into plain concrete premises.
- Option memories across the bank rewritten to state only what the record
  supports: the action chosen, in-scene facts, the commitment actually
  written, relational tone the recorded `relationalChange` carries. Removed
  claim classes: invented future durations and reactions ("they were careful
  with you for a month", "they asked somebody else within the month"),
  outcome claims that belong to the callback machinery ("and it was not
  [raised]", "and it mostly held", "got somewhere with about half of it"),
  epigram codas ("which was the point", "which is not the same as wasting
  it") and self-summarizing gloss ("were not sure for months whether that had
  been pride").
- The care commitment write's label corrected from "Looking after somebody at
  home" to "Looking after somebody in the family" — the kin gate is the
  recorded fact; co-residence was not.

### Consequence/memory bank (packet Phase 3)

- Two invented facts removed from `RETURN_SUMMARY`: the "customer" in the
  work-rule callback (the adult scene has no customer; that detail was the
  formative bank's) and "the flooding" in the neighbour-help callback (the
  incident engine decides what happened; no kind is claimed).
- Eleven missing family summaries added, so every situation able to schedule
  an aftermath returns as itself; previously `adult.debt-call`,
  `adult.housing-cost-change`, `adult.work-colleague-struggling`,
  `adult.help-with-strings`, `adult.friend-good-news`, `adult.volunteer-ask`
  and `adult.weekend-invitation` (plus the four withheld keys) all fell to the
  generic line. The withheld keys keep summaries because old saves can still
  carry their scheduled callbacks.
- `GENERIC_RETURN` reworded from the flagged "Something decided a long time
  earlier turned out to still be there." to a plain fallback, and a test now
  holds it unreachable for every schedulable family.
- Anchored identity preserved: every reword was minted as a rebind of its
  existing anchor (`npm run corpus:prose -- anchors`), one at a time; the 11
  additions minted fresh anchors; nothing was retired or hand-numbered.

## Behavioral contracts added as tests

`src/simulation/adult-situations.test.ts`:

- every withheld situation stays authored and carries a non-empty reason;
- a withheld situation is never offered, even when its old gate holds;
- household-standing requires the errands record; housing-cost-change requires
  a housing-basis obligation;
- every situation with a schedulable aftermath has a family return summary
  (the generic callback line stays unreachable);
- withheld keys keep their summaries for old saves.

## Ripples, and why they are accepted

- `src/presentation/narrative-life.test.ts` structural-divergence fixtures
  re-seeded (`shape-c` → `shape-d`): withholding five always-nearby ordinary
  scenes narrowed the early adult offering enough that the old seed pair
  converged. The contract (two lives differ for causal reasons) is unchanged
  and green on the new pair.
- `scripts/prose-corpus/transcripts.ts` campaign-alternate lane re-seeded
  (`corpus-campaign-b` → `corpus-campaign-c`): the old seed's deterministic
  pre-filing beats shifted and its contest resolved as a second win; the lane
  exists to demonstrate a loss, which the new seed does.
- `scripts/prose-corpus/corpus.test.ts` coverage counts re-pinned to the live
  measurement, as P1 did, after the bank rewording and the added test file.

## Differential corpus evidence

From `npm run corpus:prose -- diff` against the committed base-SHA baseline,
before regeneration: 72 reworded, 11 added, 0 removed, 47 regrounded (the
withheld rows), zero transitions outside `prose:life:adult:*` and
`prose:life:callback:*`. Lint warnings 310 → 288 (vague-referent −11,
and-it-scaffold −10, interpretive-ending −2, which-x-which-y −1,
rather-than-scaffold +2). The owner packet
(`docs/plans/active/p2-owner-review.md`) carries every changed line, every
withheld row, the new sentence patterns, fixed-seed before/after transcripts
and an unchanged holdout sample.
