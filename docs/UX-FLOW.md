# UX Flow

## Scope

The normal Run A entry point is the player-facing political-office scene. The
first-build developer viewer remains available at `?view=developer`; its
diagnostic access does not authorize omniscient player-facing UI.

## Run A Player Flow

1. **Enter the office**
   - Load the deterministic political-office fixture rather than the diagnostic
     dashboard.
   - Keep the warm office scene visually primary, with a compact bottom-left
     time/date/location plaque and restrained right-side pins.
   - Keep the Lexington-Fayette office explicitly synthetic; do not imply a
     sourced officeholder, building, rule, or institution.

2. **Open shell navigation**
   - Activate the bottom-left plaque as one semantic button with no disclosure
     arrow.
   - Expand the dark primary navigation upward.
   - Permit one dark submenu cascade before a deliberate workspace.
   - Keep a development-only route to the retained diagnostic viewer.

3. **Interact with a person**
   - Reach and activate the seated person by pointer or keyboard.
   - Open the concise anchored contextual menu immediately; do not insert a
     generic Talk, More, Character, or Details layer.
   - Choosing Inspect replaces the action menu with the nearby subjective read
     panel.
     The two surfaces are never visibly stacked.

4. **Read the dossier**
   - Show name, role, known age and hometown, qualitative relationship/read,
     known context, recent interaction, and explicit uncertainty/unknown state.
   - Label how the player has access without turning access, relationship, or
     uncertainty into numeric meters.
   - Never expose a private belief, hidden trait, support probability, or other
     canonical truth that the player is not justified in knowing.
   - Close with a semantic control or Escape. Every dossier action is
     simulation-time neutral.

5. **Learn one civic concept**
   - Activate the information marker beside, not inside, the typeset office
     memorandum.
   - Opening the committee-referral explanation does not mark it learned.
   - Mark it through the explicit button or Shift + left click. Equivalent
     keyboard controls remain available.
   - Hide the resting marker after learning while retaining the explanation in
     Civic reference. Persist only the allowlisted concept-level learned state.

6. **Manage pins**
   - Most pins rest tiny, while a current item may be normal and a manual choice
     may be expanded.
   - Activating a pin opens restrained textual controls for Compact, Standard,
     and Expanded. Person pins also expose Unpin; pointer, touch-style
     activation, and keyboard use the same actions.
   - Pinning Collins or Reed adds at most one person pin in deterministic scene
     order. Unpin removes only that person, never the current briefing, and a
     re-pin starts at the normal person-pin size. Later automatic importance
     changes cannot override a manual size.
   - Navigation, pin controls, and the immediate person menu dismiss on a click
     elsewhere in the scene or Escape.

Named `?fixture=` states reproduce normal, person-menu, dossier,
civic-learning, mixed-pins, navigation, and submenu browser states.

## Run B Conversation Flow

1. **Choose a person**
   - Keep two NPCs visibly present at separate scene anchors.
   - Activate either person and choose Talk directly beside Inspect and Pin
     person in the immediate contextual menu.
   - Do not insert a Talk/More layer or replace the room with a dialogue screen.

2. **Set who is addressed**
   - Open one compact lower-screen strip while the scene, people, bottom-left
     cluster, and right pins remain recognizable and usable.
   - Switch between Collins, Reed, and Everyone without restarting the session.
   - Identify the synthetic fixture player unobtrusively as `You — Cameron
Foster`; Collins and Reed remain distinct NPCs.
   - Communicate the selected addressee in the strip and with a restrained scene
     treatment, never targeting rings or hidden diagnostic IDs. Character names
     appear contextually on hover/focus near the person and are suppressed while
     the menu, Your Read panel, or conversation already identifies them.

3. **Set intended audibility**
   - Keep Normal, Quiet, and Private separate from addressee.
   - Explain reasonable hearing context in one restrained text line.
   - Disable Private in the occupied office and state naturally that Reed
     remains within plausible earshot. Do not imply magical muting or certainty.
   - Use that same current listener set for pending response eligibility. If
     Quiet-to-Reed excludes Collins, preserve Collins's pending contribution and
     do not offer Listen for it until a hearing context such as Normal includes
     Collins.

4. **Choose an intent**
   - State the constituent-services problem in ordinary language before the
     choices: three Lexington tenants sought emergency-rent help; a required
     proof-of-income form was missing from the first two county referrals; Reed
     is checking the third; and Collins is deciding whether to back a document
     checklist before future referrals.
   - Offer concise, fixture-specific intent labels such as asking Collins to
     back the referral checklist, asking Reed to check the third referral,
     asking each for the corresponding next step, focusing the checklist on the
     missing proof-of-income form, pressing, or listening.
   - Let an NPC return authored deterministic dialogue from the semantic result.
   - Keep each line tied to the briefing topic, current addressee, intent,
     preceding bounded turn, and actual semantic outcome.
   - Derive Listen from the current pending contributions: Collins may explain
     his evidence condition, then Reed may offer the verification follow-up.
     When no contribution remains, one Listen may let the room settle without
     fabricated speech; remove Listen until a later player action creates a
     legitimate new follow-up.

5. **Review or leave**
   - Switch the same bounded box between active conversation and one-turn-at-a-
     time history. Return to active conversation, collapse/resume, or close it
     without an internal vertical scrollbar.
   - Those actions, plus addressee/audibility changes, never write World or move
     time.
   - A committed turn may add same-date canonical history, but the normal UI
     never reveals source snapshots, private beliefs, numeric relationship
     changes, probabilities, or fake elapsed minutes.

## Run C Legislative Working-Document Flow

1. **Open the physical draft**
   - Notice and activate the Transit Access Pilot paper resting on the existing
     desk rather than entering a legislation dashboard.
   - Focus a readable paper workspace while retaining visible office edges,
     people behind it, the right pin rail, and a compact bottom-left
     time/location chip. The accepted full shell returns unchanged with the
     ordinary office.
   - Read authored numbered legal text as real DOM text. Keep `OFFICE WORKING
DRAFT`, `NOT INTRODUCED`, and `NOT ENACTED` explicit.

2. **Select the quantitative provision**
   - Activate the exact $8,000,000 phrase by pointer or keyboard.
   - Show one restrained anchored menu with only implemented actions: read/view
     the staff note, compare the prepared revision, ask Collins, or use the
     prepared office version.
   - Keep the selected phrase visually unambiguous without inserting civic-game
     icons or explanatory pseudo-words into legal typography.

3. **Separate text from interpretation**
   - Keep Collins's attached working annotation in the margin and label its
     author.
   - Toggling Clean copy hides the annotation but leaves every legal word
     unchanged and writes no history.
   - Before Cameron reviews the note, omit modeled consequences and every hidden
     sensitivity detail. Reading the note creates ordinary actor-specific
     policy-analysis knowledge, then shows qualified $8,000,000 versus
     $4,000,000 staff projections with provenance.
   - Derive current, prepared, and earlier-version labels from the canonical
     office-draft revision event. Before selection, $8,000,000 is current and
     $4,000,000 is prepared; afterward, $4,000,000 is current and $8,000,000 is
     the earlier office version on the paper, note, analysis, and accessible DOM.

4. **Compare without committing**
   - Present a strike/insert markup projection for `$8,000,000` → `$4,000,000`
     and name each explicitly mapped proposed outlay operation.
   - State that compare is preview only. Opening or closing it cannot change the
     active draft, date, action sequence, policy realization, effects, or
     metrics.

5. **Discuss the selected provision**
   - Open the accepted conversation strip with `Legislative working draft` and
     the selected Section 3 subject, not the emergency-rent casework copy.
   - Address Collins while Reed remains an audibility-derived Normal listener.
     Collins distinguishes working language, staff projection, appropriation,
     and implementation using information he canonically knows.
   - Commit through the existing event/claim/knowledge/perception path and close
     or review history with normal Run B controls.

6. **Choose the office working version**
   - Commit `Use $4,000,000 version as office working draft` once.
   - Update the active paper from the ordinary same-date office-draft event and
     prevent duplicate submission.
   - Do not call the action passage, enactment, appropriation, or implementation;
     do not realize policy or change metrics.
   - Return to the ordinary office and continue using people, pins, navigation,
     dossier, and Run B casework conversation normally.

## Retained Developer Flow

### Primary Flow

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
