# Causal trace and the observer inspector

A development diagnostic for reading how canonical truth, claims, knowledge,
perception, belief, decisions, relationships and consequences actually connect
in a save.

It is not a game feature, and it is not a second history. It reads canonical
records and renders the links those records already carry.

## The rule everything else follows from

**The inspector reads canonical state. It never creates canonical state.**

Concretely it must never:

- create a second history store;
- create a second causal graph and treat it as truth;
- infer an edge the repository did not record;
- rewrite canonical records to make tracing easier;
- mutate world, history, RNG-relevant state, save identity, perception,
  relationships or decisions when opened, filtered, walked, compared or
  exported;
- leak development metadata into ordinary player presentation.

Where provenance or parentage is absent, the trace renders UNKNOWN or UNLINKED.
A fabricated parent is indistinguishable from a recorded one once it is in an
exported trace, which is exactly why one is never supplied.

## Where it lives

| Path                              | Role                                                                                      |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/devtools/trace-model.ts`     | The projected-record vocabulary: classes, truth origins, links, unrecorded links.         |
| `src/devtools/trace-sources.ts`   | The registration seam. A record family becomes traceable by registering a source.         |
| `src/devtools/trace-adapters.ts`  | One adapter per accepted record family. Pure transcription of recorded fields.            |
| `src/devtools/trace-index.ts`     | The read-only index built at inspection time, including the derived downstream direction. |
| `src/devtools/trace-walk.ts`      | Upstream and downstream traversal, cycle protection, boundary reporting.                  |
| `src/devtools/trace-export.ts`    | Deterministic JSON and Markdown export.                                                   |
| `src/devtools/observer-trace.ts`  | Who heard a conversation turn, who did not, and on what basis.                            |
| `src/devtools/seed-comparison.ts` | The multi-seed comparison harness.                                                        |
| `src/devtools/trace-fixture.ts`   | The only module that writes, and only through accepted public APIs.                       |
| `src/ui/CausalTraceView.tsx`      | The development route at `?view=causal-trace`.                                            |
| `src/cli/trace-export.ts`         | `npm run trace:export`                                                                    |
| `src/cli/compare-seeds.ts`        | `npm run compare:seeds`                                                                   |

## Record classes

Two independent axes, because "what kind of record is this" and "where did its
content come from" are different questions.

**Record class** distinguishes canonical world truth from what somebody said,
from what somebody came to know, from what they concluded, from what they then
did:

`canonical-event`, `person-fact`, `causal-process`, `effect-activation`,
`spoken-claim`, `knowledge-received`, `evidence-artifact`,
`evidence-discovery`, `memory`, `perception`, `mind-state`, `private-belief`,
`public-position`, `commitment`, `relationship-change`, `decision-trace`,
`incident`, `incident-state`, `scheduled-transition`,
`scheduled-transition-state`, `presentation-metadata`, `unknown`.

`presentation-metadata` is declared for sources that carry development or
display bookkeeping. No built-in source uses it; it exists so a later source
can classify honestly instead of borrowing a class that would make debug data
look canonical.

**Truth origin** reads the record's own provenance field:

`authored`, `initialization`, `generated`, `simulated`, `source-record`,
`unrecorded`. `unrecorded` is the answer for a family that carries no
provenance at all. It is not a synonym for authored.

A record the repository cannot justify classifying stays `unknown`.

## Links, and the absence of them

Four link kinds — `causal-parent`, `source-record`, `supersedes`, `outcome` —
each carrying the exact field that produced it in its `role`, spelled the way
the record spells it: `parentCausalIds[1]`, `source.claimId`,
`context.considerations[2].sourceRefs[0].perception`.

A record with a nullable link field that is null produces an **unrecorded
link**, naming the field and saying why nothing follows. A record family with
no parent pointer at all — a historical event — says so as a root.

A walk reports five kinds of boundary, kept apart deliberately:

| Boundary            | Meaning                                                             |
| ------------------- | ------------------------------------------------------------------- |
| `no-recorded-link`  | The repository recorded nothing further here. UNKNOWN, not missing. |
| `unresolved-target` | The record names a target no registered source produced.            |
| `depth-limit`       | The walk stopped at its limit, not at the end of the chain.         |
| `cycle`             | The edge returns to a record already on the path.                   |
| `already-reached`   | A shared ancestor reached by a second path. Not a cycle.            |

The last two matter: a diamond is not a loop, and reporting one as the other
would invent a cycle the world does not have.

## The registration seam

`TraceSource` is how a record family becomes traceable:

```ts
extendTraceSourceRegistry(defaultTraceSourceRegistry(), [
  {
    key: "narrative.threads",
    family: "narrative.threads",
    declaredClass: "presentation-metadata",
    collect: (world) => [...],
  },
]);
```

The graph logic knows nothing about which families exist. **Packet 60 registers
its narrative and Pennywise trace sources here** and needs no change to the
walker, the index, the export or the UI. Two rules bind a registered source:

- it may not manufacture an edge — every link must be a field the record
  carries; and
- it may not claim a record id another source already produced. Shadowing is
  rejected rather than merged, because a silent replacement would change what a
  trace means without changing anything visible about it.

## Who heard it

`projectConversationObserverTrace` reads one conversation turn from the records
it wrote: the event, the claim, each participant's direct knowledge record,
each recipient's told-by knowledge record and the claim it cites, the
perception each formed and the knowledge record it names, the relationship
interaction, and any durable decision trace appended in the turn.

Absence is the hard part, because absence is not a record. Two honest answers
are kept apart:

- **`recorded-participant-without-claim-knowledge`** — the event lists this
  person as a participant, and no knowledge record for this event cites a claim
  made in it.
- **`declared-present-but-not-an-event-participant`** — a caller-supplied
  presence set names this person, and the canonical event does not list them at
  all. The caller must say where that set came from, and the trace repeats it.

With no presence set supplied, the trace says plainly that it can only speak
about recorded participants.

### Quiet versus normal

The fixture asks the referral verifier for a commitment, then asks the briefing
lead. Audibility changes causality, not wording:

|                                   | normal                                  | quiet                  |
| --------------------------------- | --------------------------------------- | ---------------------- |
| Resolved listeners, turn 1        | briefing lead and verifier              | verifier only          |
| Briefing lead in the event record | participant                             | not a participant      |
| Briefing lead's knowledge record  | told-by, citing the claim               | none                   |
| Briefing lead's perception        | heard-claim, citing claim and knowledge | none                   |
| Turn 2 decision consults          | the perception from turn 1              | an older perception    |
| Turn 2 upstream chain ends at     | turn 1's conversation event             | a proposition exposure |

The second turn's decision therefore rests on a different chain in the two
runs. Nothing in the inspector arranges that; it falls out of the accepted
conversation rules and is read back off the records.

### Private

Private is a different kind of difference and gets a different room, because
the accepted shared office refuses a private exchange outright while a second
person is within earshot and says why. In the room the fixture provides for it,
Private changes what the records say the exchange _was_ rather than who could
hear it: the claim is recorded with audience `private` instead of `limited`,
the event with visibility `private`, and the event tag reads
`conversation.audibility.private`. The durable decision and the claim chain are
written exactly as before.

## Decisions and consequences

A durable decision trace records the frontier it was evaluated against
(`context.cutoff.historySequenceExclusive`), which equals the sequence it was
appended at, and the event carrying the response follows at the next sequence.
The observer trace reports that as `immediatelyPrecedesEvent` and labels it
recorded **ordering** — it is arithmetic on recorded fields, not a recorded
causal edge, and the trace does not pretend otherwise.

The causal edges that do exist run the other way and are followed literally:

```
decision trace
  → context.considerations[n].sourceRefs[0].perception
  → source.claimId / source.knowledgeId
  → eventId
  → (root: history.events carries no parent pointer)
```

## Deterministic export

Both forms carry enough identity to stand alone in a bug report: seed, world
id, schema and generator version, current date, history frontier, world content
id, the request, the record classes, the explicit links, and every boundary.

Identical replay plus identical request produces byte-identical output. JSON
goes through `canonicalJson`, the same emitter the world's own content identity
uses — a tool for showing what the repository recorded has no business
disagreeing with the repository about how to write it down. Nothing in an
export is derived from wall-clock time or ambient randomness, and the devtools
boundary test enforces that.

## Multi-seed comparison

`npm run compare:seeds` generates one world per seed through
`createNewGameWorld` — the same call the title screen makes — and reports where
they differ, reading canonical records through accepted queries.

Dimensions that are only a name (given name, family name, content hash) are
marked `nameOnly` and reported separately, so "the generator varies" can never
be satisfied by two different surnames. Dimensions the generator did not vary
are listed plainly rather than omitted.

At the shipped default setup, three seeds differ in birth date, in the age of
the adult they share a home with, and in education enrollment date — a
different household, not a different label. Where accepted main genuinely lacks
a variation category, the report says so rather than inventing one.

## Not reachable from play

`?view=causal-trace` is the only way in, and the App route table is the only
place that names it. No player module, presentation module or other UI module
references the view, the component, or `src/devtools`; the world never grants a
character a capability for it; and the game's front door offers no link to it.
All four are asserted by test.
