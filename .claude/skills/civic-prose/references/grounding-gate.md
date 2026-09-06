# Grounding gate

The blind reserve round established that the prose Skill materially improves
owner-preferred writing, and that it still shipped a repeated hard-grounding
pattern: invented dates, invented delivery/staging, one actor's silence widened
to a group. A generic "no invention" rule and a generic self-check were already
in the Skill when those failures happened. Generic language is therefore not
the fix — this file is the enumerated, checkable version, and it is enforced by
a separate verification stage rather than by good intentions.

Grounding outranks every style rule. None of the owner's ten prose rules
authorizes an unsupported fact.

## The rule for absent facts

An absent packet field means NOT ESTABLISHED. It never means "pick something
reasonable". `UNKNOWN / DO NOT ASSUME` entries bind even when the natural
sentence wants them. "Plausible", "harmless", "implied", "needed to make the
sentence work", and "standard for this surface" are not support.

## Enumerated classes

### 1. Days, dates, times

Never introduce a weekday, calendar date, month, clock time, or relative-day
label ("today", "tonight", "overnight", "this morning", "next week") that the
packet does not supply. A brief that needs a dateline does not get to invent
one; write the brief without it.

Ordinary arithmetic over numbers the packet actually supplies stays legal where
the contract already allows it (a 2:00 hearing three hours after an 11:00 note
is three hours away). Arithmetic never manufactures a day or date.

### 2. Interaction delivery and staging

Never invent how an interaction reaches the character: phone call, email, text,
letter, message arriving, someone entering, stopping by, walking in, standing
in a doorway, leaning on a desk, handing over a paper. The packet must
establish the channel, the action, or the location.

If the moment renders naturally without naming a channel, omit the channel —
that is the normal answer, not a compromise. If the requested surface genuinely
cannot be made intelligible without the missing delivery fact, use
`SAFE_RENDER_WITH_OMISSION` or `MISSING_CONTEXT`. Inventing the channel is
never the third option.

### 3. Scope

Never widen one actor's known action or non-action to a group. One person
giving no quote does not become "members did not respond", "others declined to
comment", or "no one returned a request for comment". If the packet establishes
the fact for one named actor, the prose may state it for that actor only.

### 4. Player identity

Never infer player gender or third-person pronouns from role, title, or
context. Second person is the required character-facing form. In-world
artifacts (surfaces 9a–9e) keep their native register — and must still use only
facts the packet supplies, which for an unnamed, ungendered player character
means referring to them by office or role, not by an invented pronoun.

### 5. Surface authority

`SURFACE` and `OUTPUT REQUEST` control form, not just tone.

- A task note or memo is not silently staged as spoken dialogue — quoted or
  unquoted. "Nasser tells you, leaning against the frame" is a surface failure
  in a task note even if every fact in the sentence is supported.
- A direct interaction is not silently collapsed into a task card.
- Note and task-card prose is correct when the in-world surface really is a
  note or a task record. The owner's separate finding stands: dry record prose
  is not a defect on a record surface.

### 6. Character knowledge

The character may be shown only what the packet says they acquired, and by the
means the packet gives. World truth and player knowledge are not character
knowledge.

## Verification stage

Drafting and verifying are separate steps, done in that order, and the verifier
does not write.

1. **Draft** under the prose contract.
2. **Inventory the claims.** Split the player-facing prose into individual
   assertions. Ignore `result:`, `omitted:`, `missing:`, `reason:` — judge what
   a player would read.
3. **Trace each claim to a packet line.** Not to a general impression of the
   packet — to a line. Anything untraceable is unsupported.
4. **Walk the six classes above by name**, even when the prose reads clean.
   These are the classes that have actually failed review; scanning for "does
   anything look invented" is what already failed.
5. **Resolve.** Cut the unsupported claim, or move to
   `SAFE_RENDER_WITH_OMISSION` naming it, or return `MISSING_CONTEXT`. Never
   keep an unsupported claim because the sentence is better with it.

Two mechanisms enforce this outside the writer's own judgement:

- `npm run prose:eval -- ground <packet> <output>` runs a deterministic check
  for the enumerated classes. No model call; it runs in CI. It is a floor, not
  a proof — it catches the enumerated classes and defers the rest.
- The `civic-prose-grounding-reviewer` agent does semantic claim-vs-packet
  checking and returns `GROUNDING: PASS` or the specific unsupported claims. It
  never rewrites prose and never comments on style. Its reply is parsed
  fail-closed: anything that is not an unambiguous PASS is not a pass.

Both are development-time. Shipped play never calls a model.
