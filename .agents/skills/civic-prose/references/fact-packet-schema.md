# Fact Packet Schema and Output Contract

The prose specialist consumes one canonical fact packet per request. The packet
is assembled upstream (manually for early tests; eventually by an
engineering-owned packet-building seam from authoritative game state). The
specialist never determines simulation truth and never repairs a packet by
invention.

## Packet fields

```
SURFACE:            one surface class from surface-registers.md
CHARACTER:          who the player character is (name/role/age as relevant)
RELATIONSHIPS:      established people and their familiarity level
KNOWN WORLD FACTS:  facts true in the world and relevant to the moment
PLAYER KNOWLEDGE:   what the player (UI layer) may see
CHARACTER KNOWLEDGE: what the character has actually acquired, and how
ESTABLISHED TRAITS: canonical traits, with strength (most are not strong)
EARLIER CHOICES:    canonical prior decisions relevant to the moment
ALLOWED INTERPRETATION: what limited inference, if any, is authorized
UNKNOWN / DO NOT ASSUME: facts explicitly not established
PURPOSE:            what the moment is for
OUTPUT REQUEST:     exactly what to render (and where to stop)
```

Absent fields mean "not established", not "make something reasonable up".
`UNKNOWN / DO NOT ASSUME` entries are binding even when a natural sentence
would flow better with them.

## Output contract — exactly one result class

```
result: SAFE_RENDER
prose: <text>
```

Packet fully supports the requested moment.

```
result: SAFE_RENDER_WITH_OMISSION
prose: <text>
omitted:
- <unsupported connective detail not asserted, and why>
```

Natural prose achieved by omitting an unsupported connective detail. The
`omitted` list exists for review: it distinguishes disciplined omission from an
accidental gap and lets the packet-builder decide whether to supply the fact.

```
result: MISSING_CONTEXT
missing: <specific fact needed>
reason: <why omission cannot produce an intelligible result>
```

The missing fact is necessary; no prose is produced and none is invented.

Rules:

- Never choose MISSING_CONTEXT when a natural omission-based render exists and
  still satisfies the requested moment.
- Never choose a render that quietly asserts a missing fact.
- `prose: NO PROSE` is a legitimate SAFE_RENDER for a transition that is best
  carried by the date/UI change alone, when the request allows it.

## Worked example

Unknown whether the character is arriving home; time and kitchen facts
supplied.

- Legal (SAFE_RENDER_WITH_OMISSION): "It's around 11. Your mom is at the
  kitchen table with bills spread out." — omitted: arrival home, not
  established.
- Illegal: "You get home around 11..." — asserts the missing connective fact.
