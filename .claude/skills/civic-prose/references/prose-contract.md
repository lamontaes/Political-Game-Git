# Civic Prose Contract (v0.2 accepted authority)

Source of authority: owner calibration sessions of 2026-09-05 and the accepted
v0.2 Drive authority (`02_PROSE_SYSTEM_V0.2_ACCEPTED_AUTHORITY — 2026-09-05`).
This file restates that authority for the prose specialist. It does not decide
what is currently assigned; canonical control stays with the Drive chain.

## Product center

Our Civic Duty is a politics-and-government RPG supported by life simulation —
not a comprehensive career simulator. Politics, governing, legislatures,
executives, courts, campaigns, staff work, bargaining, public decisions,
constituents, and political relationships are the center. Ordinary life keeps
the character a person and supports that center.

Unrelated careers primarily establish income, schedule/time demand, time
passage, location, social standing/network where relevant, and ordinary-life
context. They may occasionally create politically relevant openings
(endorsement, activism, campaign relationship, appointment, controversy) but
never become profession simulators. Politically adjacent careers (law,
legislative/committee staff, campaign work, public administration) may receive
depth where the connection materially changes access, qualifications,
relationships, knowledge, reputation, resources, or later public-office
choices.

## Role

The prose specialist is a development-time authoring/editorial tool. It renders
canonical fact packets into reviewed player-facing prose. It does not determine
simulation truth. Accepted prose is stored with authored game content; ordinary
shipped play does not depend on generating new prose, and the same canonical
state/seed/content stays reproducible.

## Hard rules (violations fail regardless of style)

1. **No invention.** Never add motives, objects, relationships, history,
   consequences, locations, arrivals/departures, feelings, social reactions,
   connective events, or knowledge the character has not acquired.
   "You get home around 11" is legal only if the packet establishes arrival.
2. **Three knowledge layers.** World truth, player knowledge, and character
   knowledge are distinct. Character-facing narration asserts as known only
   what the character actually acquired. The child who hears "Not this month"
   may be shown that observation; "Money is tight at home" may not be
   asserted.
3. **No system-label leakage.** Internal shorthand, state names, and engine
   abstractions never surface ("the furnace is still the furnace", "something
   decided earlier", "the half of the week you agreed to hold"). When a
   concrete referent exists, use it; "the thing / the week / something" are
   forbidden in its place.
4. **Choices describe actions.** Never append an uncertain predicted
   consequence to an action label ("Vote no and risk angering leadership").
   Certain consequences intrinsic to the action must be clear before
   confirmation (a job that certainly requires moving). A likely-but-uncertain
   consequence the character plausibly knows is exposed separately through a
   grounded channel — aide warning, relationship information, political
   context, status note, dialogue — never baked into the label:
   context "Your aide thinks leadership will take a no vote badly." +
   choice "Vote no."
5. **Player choice outranks trait.** Never narrate internal conflict
   ("Against your instincts...") merely because a trait disagrees with the
   selected action.
6. **Missing context, two paths.** If the supplied facts alone support
   natural, useful prose, write the fact-safe version by omitting the
   unsupported connective detail ("It's around 11. Your mom is at the kitchen
   table with bills spread out."). If the missing fact is necessary to make
   the moment intelligible, return MISSING_CONTEXT naming the specific fact.
   Silent invention and unnecessary MISSING_CONTEXT are both failures.

## Defaults (overridable only by packet-supplied conditions)

- Second person for character-facing narration and player actions; natural
  contemporary American English. In-world artifacts keep their native
  register (see `surface-registers.md`).
- Don't tell the player what their character feels; prefer observable events
  and actions. Interpretation needs strong evidence (explicit choice, explicit
  dialogue, very strong canonical trait plus current behavior), and stays
  minimal even then: "You keep your voice down." over "You surprise yourself
  by staying calm." — and the latter only sparingly.
- Prose weight follows canonical importance, never causal traceability.
  Minor: "The bill fails, 47–52." Months of canonical work: "Months of work
  end on a 47–52 vote."
- Serious events get grounded directness ("Your mom calls. Your uncle died
  this morning."), not cinematic suspense ("At 9:07, your phone rings...")
  unless the scene genuinely requires an unfolding reveal.
- Ordinary life may be ordinary — relationships, atmosphere, continuity, time
  — without foreshadowing or payoff. Never add domestic filler because a
  schedule slot is empty.
- Relationship references use the natural term at established familiarity
  ("your mom", "Marcus"), never repeated re-explanation ("Marcus, your friend
  and caucus leader"). Register shifts with social setting; a formal letter
  differs from home narration. Unknown officials get titles ("Representative
  Harris"); established ones don't ("Harris").
- Political specificity is central: committee, caucus, amendment, floor,
  second reading, whip count, constituents, bill designations, procedural
  stage. Never genericize institutional facts to sound "human". Narration
  avoids insider jargon ("knocking doors") except in professional dialogue.
- Direct vs. summarized dialogue is a per-moment decision: direct when the
  exchange itself matters, personality matters, or a player response is
  likely; summarized when the information matters more than the exchange.
  Never quote mechanically.
- Age conditions knowledge, capability, authority, situation, and sometimes
  noticed detail — never babyish diction.
- Transitions: NO PROSE (date/UI change) is a first-class treatment; otherwise
  short contextual texture. Never mechanical "A month later" / "School
  continued..." loops.
- Variation: UI/status text may repeat verbatim when the same factual state
  warrants the same text. Narrative prose varies when context varies (people,
  relationship, lens, location, time, season, event, history, surface,
  importance) — never by synonym-cycling identical filler.
- Local/seasonal texture is desirable when location, date, and event existence
  are established; it may stay ambient; never invent a local event for
  flavor.
- Memory and recognition scale with salience, relationship, repetition,
  importance, and elapsed time — no perfect autobiographical recall, no
  obligatory "This reminds you of...". UI provenance markers may carry the
  causal link instead of prose.
- World developments reach the character through a plausible established
  information path (person, aide, TV, phone, news, workplace, school,
  interface); only enormous events interrupt ordinary life.
- Personality colors perspective subtly — selection and ordering of facts
  actually present in the scene. Only an exceptionally strong, canonical,
  identity-level trait earns out-of-context noticing. No caricature.
- Profanity: generic narration is not profane, and the game's voice is never
  inferred from the owner's conversational register. Character dialogue may
  use profanity only when the specific person's established voice,
  relationship, context, and scene intensity support it.
- In-world artifacts: the specialist may author/edit human-facing artifacts,
  but formal truth-bearing legal/procedural structure remains owned by
  authoritative simulation/source data and must not be creatively rewritten
  into a different meaning.

## Conditionality

Do not turn contextual approvals into "always". Examples approved for one
surface are not universal templates. Do not infer that all dialogue should be
direct or summarized, all transitions omitted, all serious events blunt, or
all local events mentioned. Every conditional example in the corpus carries its
condition; apply it only when the packet clearly satisfies it.
