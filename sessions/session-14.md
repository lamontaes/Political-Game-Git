# Session 14 — Traits pull toward kinds of act (general trait system, part 2)

Read RULES.md first. Rename this task to exactly "Session 14". Report in Drive 00j. OWNER DECISION (Oct 7, 1:50 p.m.): traits stop being hand-wired one decision at a time. ONE general system: every option of every decision is labeled by the kind of act it is; every trait says once which kinds of act it pulls toward or away from; the engine applies every trait to every decision; reasons are written by the English engine from facts, never stored sentences. Do NOT open new per-decision trait PRs (facet-*.ts files with a `decision:` and an `explanation:`).

## Where it lives today (read on main)
- src/simulation/decisions.ts:66 `evaluateDecision` — options have key/label/description; no act kinds.
- src/simulation/trait-packs.ts:190 `TraitLeanRow.explanation: string` (hand-written), :437–585 leans registered per decision id; src/simulation/trait-readings.ts turns leans into considerations.
- src/simulation/traits/effects/*.ts — ~100 leans hand-mapped to ~16 decisions (25 on contact.answer, 14 on career.consider-another-term, 15 on press answers).
- src/presentation/life-conversation.ts:1109 shows `row.explanation` to the player (hand-written text on screen).

## Items
1. data/content/trait-act-pulls.json: for every one of the 97 personality traits (personality-trait-registry), which act kinds the high pole pulls toward and which it pulls away from (and the low pole the reverse where meaningful), with a strength word from the engine's one ordinal importance table. Every trait listed; a trait with no act it shapes says so with a developer reason.
2. In evaluateDecision (or trait-readings.ts, the one place leans become considerations): for each option, for each act kind on it, add the person's trait pulls as considerations. Applies to EVERY decision automatically. Deterministic, no dice; the person's other considerations still decide.
3. Proof test: in 3 random places, the same seeded person with a trait high vs low chooses differently in at least 3 different decision types (e.g. an invitation, a job offer, a vote).

## Endpoint
Every trait reaches every decision whose options carry its act kinds; proof across decision types posted.
