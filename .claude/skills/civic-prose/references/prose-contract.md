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
   The enumerated, checkable form of this rule — and the verification stage
   that enforces it — is `grounding-gate.md`. It is binding, not advisory.
   In particular: no day/date/time the packet does not supply; no invented
   delivery channel, arrival, or staging; no widening one actor's action or
   non-action to a group; no player gender or third-person pronoun; and
   SURFACE/OUTPUT REQUEST controls form, so a task note is not staged as
   dialogue and a direct interaction is not collapsed into a task card.
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
  register (see `surface-registers.md`). See owner rule 1 below: this is a
  hard gate, not a stylistic default, and a role-noun in the packet is the
  trap that breaks it.
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
  importance) — never by synonym-cycling identical filler. A single packet
  also admits several genuinely different good renderings; see owner rule 9.
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

## Owner rules — locked 2026-09-05

Source: `WAVE_1_OWNER_VERDICTS — LOCKED — 2026-09-05` (Drive), the owner's
review recorded before any source mapping was opened and treated as immutable.
The rules below restate that record; the wording of the defects is the owner's
own. They govern quality. The hard rules above govern legality, and they win:
nothing here authorizes inventing a fact to produce a better sentence.

The judged calibration set that produced these rules is retired from held-out
use and may inform examples. The remaining sealed reserve packets stay unread:
never open, cite, paraphrase, or generate against them, and never write a
held-out packet id into this skill (`npm run prose:eval -- hygiene` enforces
the id shape).

### 1. Second person is mandatory in player-facing prose

Player-facing narration addresses the player as "you". Third-person drift —
"he", "the senator", "the judge", "the representative" — is a rejection, not a
blemish, and it is the single most damaging failure observed: it converts a
scene the player is inside into a dossier they are reading about someone else.

The trap: a fact packet's CHARACTER line frequently carries a role noun
("state representative", "circuit judge"). That line says who the player is.
It is never a licence to narrate them by that noun.

- Rejected: "The judge reviews the motion before the hearing."
- Rejected: "He arrives at the office ahead of his staff."
- Correct: "You read the motion again before the hearing."

The only exemption is the in-world artifact surfaces (9a–9e): a news article,
letter, court document, memo, or dossier keeps its native third-person
register, because the player is reading it, not living it.

### 2. Do not restate character state the player already knows

A fact appearing in the packet is not a reason to say it. Player-facing prose
must not orient the player to their own life. Never open by re-establishing
office, term, chamber, title, tenure, authorship of the player's own bill, or
a household relationship the player has lived in for years.

- Rejected: "You're a second-term state representative." — the player knows.
- Rejected: "HB 214 — your bill — comes up Thursday." The bill designation is
  fine; "your bill" is redundant player-state reminder. "HB 214 comes up
  Thursday."
- Rejected: "your spouse of eighteen years" — dossier exposition, not play.

Include a relationship, history, or credential only when the immediate scene
is not intelligible without it, and then say it the way a person would, once.
The default is to start inside the moment.

### 3. Plain political language, not literary phrasing

Prefer the direct sentence a person in that building would write. Conspicuous
metaphor, abstraction about the conversation itself, and composed cadence all
read as generated and are rejected even when perfectly grounded.

Owner-flagged constructions, all rejected:

- "changes the shape of the conversation" — say what changed: the pressure,
  the count, the dynamics; or state the fact and stop.
- "say the plain thing" — then say it.
- "you stand there, holding the sentence" — narrate the observable, or end.
- "that is not the version Aaron just put in the room" — say what Aaron said
  and how it differs.
- "the one you've met exactly once" — unnatural precision as characterization.

Diagnostic: if a line would be quoted as good writing, it is probably wrong
here. Ornamental scene-setting and restating the same beat twice for rhythm
are the same defect.

### 4. Ordinary institutional terminology; natural terms in dialogue

Political specificity stays exact (committee, second reading, whip count,
bill designation). But do not reach for a stiffer or more writerly word than
the one people actually use. Where both are factually accurate, conversation
takes the natural term: "library tax", not "library levy". Formal documents
may keep the formal term where it is the legally correct one.

### 5. Dialogue sounds spoken, not authored

People state things flatly, interrupt, trail off, and leave the obvious
unsaid. Lines should be sayable in one breath by that specific person. No
epigrams, no balanced clauses, no character delivering the scene's thesis.
Direct dialogue still earns its place per surface 6; when the information
matters more than the exchange, summarize.

### 6. Money is an actual arrangement, not a UI label

State money the way the person offering it would.

- Rejected: "The offer: $500." — game-show / abstract UI wording.
- Correct: "She's offering you $500 for your time."
- Correct: "$500 to play two songs."

The same rule covers fees, salaries, contributions, and settlements: name who
is paying, for what, and on what terms, in a sentence.

### 7. Do not narrate consequences or meaning more firmly than the facts

Rule 4 of the hard rules bars predicted consequences in choice labels. The
same discipline applies to scene endings and interpretation: do not close by
explaining what the moment signifies, what it will cost, or what happens next.
State the concrete circumstance and let the player draw the obvious political
conclusion. An ending that over-explains is rejected even when its inference
is correct.

### 8. Reach the decision pressure, then return control

A scene exists for a decision. Get to it without preamble, and stop as soon as
the player can act. Handing control back explicitly — "How do you respond?" —
is a strong, owner-preferred ending. Continuing to narrate after the pressure
has landed is a defect, not generosity.

### 9. Preserve grounded variation

Several materially different renderings of one packet can all be correct; the
owner has declared three-way ties. Do not collapse a fact packet toward a
single canonical sentence, and do not treat one approved rendering as the
template for its surface. Equally, do not manufacture variety by swapping
synonyms into the same skeleton — real variation comes from which grounded
facts are selected, ordered, and left out.

### 10. Dry institutional documents stay dry

Formal letters, orders, memos, and filings need no decorative prose to feel
authored. Their register is the point (surfaces 9b–9d).

## Conditionality

Do not turn contextual approvals into "always". Examples approved for one
surface are not universal templates. Do not infer that all dialogue should be
direct or summarized, all transitions omitted, all serious events blunt, or
all local events mentioned. Every conditional example in the corpus carries its
condition; apply it only when the packet clearly satisfies it.
