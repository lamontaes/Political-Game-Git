# UX Flow

## Scope

This document describes the first-build developer simulation viewer. It is not the final game shell and its diagnostic access does not authorize omniscient player-facing UI.

## Primary Flow

1. **Start with the demo world**
   - Load the default seed deterministically without a side effect.
   - Show the active seed, date, jurisdiction, people, and history immediately.
   - State persistently that all people, events, and Lexington-Fayette details are synthetic placeholders.

2. **Create or reload**
   - Let the developer edit a pending text seed and submit it by form or keyboard.
   - Keep the pending input visibly distinct from the active seed.
   - Reconstruct the baseline world, discard in-memory advancement, and select the first generated person.

3. **Advance time**
   - Invoke a simulation action rather than editing the displayed date.
   - Advance exactly seven days and refresh all panels from returned state.
   - Announce the new date and number of newly recorded events in a polite status region.

4. **Inspect a person**
   - Select a person by stable ID without consuming randomness, advancing time, materializing detail, writing history, or changing observer/person control state.
   - Show stable identity, typed biography facts, lightweight/materialized state, and a combined biography/event timeline.
   - Offer an explicit, idempotent materialization action for a lightweight person.
   - Keep factual biography, generated detail, subjective memories, and relationship interactions visually and semantically distinct.
   - Label the mind panel as developer-only internal state rather than information automatically available to a player character.
   - Show personality-tendency and personal-value histories, goal lifecycles, personal appraisals, explicit perceptions, temporary-state history, and recent durable decision traces in separate sections.
   - When showing an appraisal, present the canonical event summary separately from the person's interpretation; never make diagnostic truth look like the person's knowledge.
   - Show active or expired status for temporary records without turning them into a permanent mood meter.
   - Explain decision traces with qualitative option availability, blockers, considerations, bounded-variation labels, and source snapshots rather than a raw utility calculation.
   - Show sparse proposition exposure, private-belief history, public positions, campaign commitments, principles, complete subject-knowledge history, fact-derived expertise, and resolved provenance in separately labeled diagnostic sections.
   - Resolve political belief formation to the durable decision trace when one was used.
   - Show categorical descriptions only; do not expose raw ideology, personality, trust, persuasion, relationship, utility, or random numbers.

5. **Review history**
   - Present global events newest-first with ISO date, type, summary, visibility, tags, structured context, participants, and involved entities.
   - Show which people have knowledge records, what they believe, the knowledge source, and any later claims linked to the event.
   - Derive person history by filtering the same canonical records.
   - Preserve stable event and entity IDs in expandable diagnostic detail.

## UX Rules

- Never use color alone to communicate state.
- Use semantic headings, labeled forms, real buttons, visible focus, and machine-readable `<time>` values.
- Empty selection and missing-history states must be explicit.
- Sparse mind or political state must render as absence or no formed view, not a fabricated neutral score.
- Long stable IDs must wrap without breaking the layout.
- React render timing, Strict Mode, current selection, viewport size, locale, or display order must never feed simulation state.
- Diagnostic truth, subjective knowledge, memory, appraisal, perception, and public speech must be labeled as separate layers.
- Do not expose raw personality values, relationship or trust scores, decision utilities or random draws, persuasion currencies, true support, deterministic support thresholds, or other forbidden formulas.
- Later player-facing complexity should be explained through context, advisers, reports, tooltips, and archives.
