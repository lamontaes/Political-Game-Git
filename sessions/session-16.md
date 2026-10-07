# Session 16 — Personality you can see across a life (general trait system, part 4)

Read RULES.md first. Rename this task to exactly "Session 16". Report in Drive 00j. OWNER DECISION (Oct 7, 1:50 p.m.): traits stop being hand-wired one decision at a time. ONE general system: every option of every decision is labeled by the kind of act it is; every trait says once which kinds of act it pulls toward or away from; the engine applies every trait to every decision; reasons are written by the English engine from facts, never stored sentences. Do NOT open new per-decision trait PRs (facet-*.ts files with a `decision:` and an `explanation:`).

## Where it lives today (read on main)
- src/simulation/decisions.ts:66 `evaluateDecision` — options have key/label/description; no act kinds.
- src/simulation/trait-packs.ts:190 `TraitLeanRow.explanation: string` (hand-written), :437–585 leans registered per decision id; src/simulation/trait-readings.ts turns leans into considerations.
- src/simulation/traits/effects/*.ts — ~100 leans hand-mapped to ~16 decisions (25 on contact.answer, 14 on career.consider-another-term, 15 on press answers).
- src/presentation/life-conversation.ts:1109 shows `row.explanation` to the player (hand-written text on screen).

## Items
1. A 30-day watch in 3 random places (one territory): per person in the focus circle, count decisions where a trait changed the choice, by decision type. Post the table here. Today almost all of it is invitations and press answers; the goal is every decision type.
2. Find decision types that still never feel a trait (their options lack act kinds, or no trait pulls their kinds) and fix them through Sessions 13/14's data — never a per-decision lean.
3. Hold reviews: help the mergers by reviewing open facet PRs: each open per-decision trait PR is either converted into the table (comment the conversion) or closed with "superseded by the general trait system".

## Endpoint
In the watch, traits change choices in every decision type that runs; no open per-decision trait PRs remain.
