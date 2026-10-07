# Session 13 — Act kinds on every decision option (general trait system, part 1)

Read RULES.md first. Rename this task to exactly "Session 13". Report in Drive 00j. OWNER DECISION (Oct 7, 1:50 p.m.): traits stop being hand-wired one decision at a time. ONE general system: every option of every decision is labeled by the kind of act it is; every trait says once which kinds of act it pulls toward or away from; the engine applies every trait to every decision; reasons are written by the English engine from facts, never stored sentences. Do NOT open new per-decision trait PRs (facet-*.ts files with a `decision:` and an `explanation:`).

## Where it lives today (read on main)
- src/simulation/decisions.ts:66 `evaluateDecision` — options have key/label/description; no act kinds.
- src/simulation/trait-packs.ts:190 `TraitLeanRow.explanation: string` (hand-written), :437–585 leans registered per decision id; src/simulation/trait-readings.ts turns leans into considerations.
- src/simulation/traits/effects/*.ts — ~100 leans hand-mapped to ~16 decisions (25 on contact.answer, 14 on career.consider-another-term, 15 on press answers).
- src/presentation/life-conversation.ts:1109 shows `row.explanation` to the player (hand-written text on screen).

## Items
1. data/content/act-kinds.json: the vocabulary of kinds of act (about 20–30, e.g. confronting, cooperating, conceding, risky, cautious, honest, deceptive, generous, self-serving, social, withdrawing, rule-following, rule-bending, loyal, independent, public, private, caring, punishing, ambitious, content, novel, routine). Each kind: id + one-line meaning for developers (not player text).
2. Add `actKinds: readonly string[]` to the decision option type (decisions.ts); assert every option has at least one kind from the vocabulary.
3. Label every option of every decision type that calls evaluateDecision (grep all callers; list them in the PR) — one PR per area (contact/people, press, campaign, career/jobs, legislation, courts, money, family). Test: every option in every registered decision has ≥1 valid kind.

## Endpoint
No decision option in the codebase lacks act kinds; the test enforces it.
