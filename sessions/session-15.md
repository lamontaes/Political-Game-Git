# Session 15 — Convert the hand-wired leans and remove stored reasons (general trait system, part 3)

Read RULES.md first. Rename this task to exactly "Session 15". Report in Drive 00j. OWNER DECISION (Oct 7, 1:50 p.m.): traits stop being hand-wired one decision at a time. ONE general system: every option of every decision is labeled by the kind of act it is; every trait says once which kinds of act it pulls toward or away from; the engine applies every trait to every decision; reasons are written by the English engine from facts, never stored sentences. Do NOT open new per-decision trait PRs (facet-*.ts files with a `decision:` and an `explanation:`).

## Where it lives today (read on main)
- src/simulation/decisions.ts:66 `evaluateDecision` — options have key/label/description; no act kinds.
- src/simulation/trait-packs.ts:190 `TraitLeanRow.explanation: string` (hand-written), :437–585 leans registered per decision id; src/simulation/trait-readings.ts turns leans into considerations.
- src/simulation/traits/effects/*.ts — ~100 leans hand-mapped to ~16 decisions (25 on contact.answer, 14 on career.consider-another-term, 15 on press answers).
- src/presentation/life-conversation.ts:1109 shows `row.explanation` to the player (hand-written text on screen).

## Items
1. For each existing file in src/simulation/traits/effects/ (facet-*.ts and the others), move what it meant into trait-act-pulls.json (Session 14's table) and the act kinds (Session 13); then delete the per-decision lean once parity holds (same person, same decision, same choice in its proof test). One PR per ~10 traits.
2. Remove `explanation` from TraitLeanRow (trait-packs.ts:190) and every stored reason sentence; remove the fallback at src/presentation/life-conversation.ts:1109 that shows it.
3. The reason a person gives is composed by the English engine from facts (trait, act kind, decision, the other side) — call the existing composer; if a fact has no composer bank yet, show no reason (never a stored sentence).

## Endpoint
src/simulation/traits/effects/ holds no per-decision leans and no hand-written reasons; grep for `explanation:` in traits finds nothing; all proof tests still pass.
