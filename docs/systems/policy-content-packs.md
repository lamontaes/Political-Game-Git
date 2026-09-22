# Policy Content Packs

How the thing a bill is _about_ gets into a world, and why a new world starts
with none of it.

## The state this replaces

A new world ships with an empty policy catalogue: no domains, no issues, no
propositions, no subjects, no principles. `assertProductionCatalogBoundary`
enforces that emptiness, so a world that acquires policy content — at
construction, through a later edit, or by loading a tampered save — fails to
exist rather than being written to disk.

That is worth stating plainly, because it looks like an oversight and is not.
The catalogue was emptied on purpose. Before `production-catalog.ts` existed
there was exactly one set of catalogues, built by `createSynthetic*Catalog` to
exercise the engine, and `createWorld` handed it to anybody who did not ask for
something else. A player's five-year-old was saved carrying a "Synthetic
certain-death fixture" mortality table and a policy corpus versioned
`synthetic-stage-3-v2`: none of it visible on screen, all of it in the save
file, none of it describing anywhere real. The repair was not a better set of
invented content. It was the honest answer — a new game has read nothing, so it
carries nothing.

The cost of that honesty is the gap this document closes. The bill lifecycle is
finished and has nothing to be about. A player can file a measure, walk it
through a real chamber's procedure, amend it, pass it and record its effect,
and at no point does the world hold a single question that the measure could be
said to concern.

## Why packs, and not a shipped corpus

The obvious repair — author a starting catalogue and relax the boundary — fails
twice. It puts invented content back into every save, which is the exact defect
the boundary was built to catch. And it hard-codes what a political game can be
about, in a project whose standing rule is that content is data, discovered
rather than imported, modder-friendly in the way RimWorld and The Sims are.

So policy content arrives the way trait content does: as packs. A pack is data.
It declares a name, a provenance, and rows — domains, issues, propositions,
knowledge subjects, political principles. `loadPolicyPacks` reads whatever
packs are registered and produces a registry; `createProductionPolicyCatalog`
composes the world's catalogue from that registry. `POLICY_PACKS` ships empty,
so a world built today is byte-for-byte the world built before this change.

## Provenance is required, not encouraged

Every pack must declare one of two things about itself, and a pack that will not
say is refused whole, every row with it:

- `authored-fiction`, with a note saying what the author intends it to be.
- `sourced`, with at least one named source a reader could go and check, and a
  note.

The reason is the reason the catalogue was emptied in the first place. From
outside a save, "nobody sourced this" and "somebody sourced this and did not
write it down" are indistinguishable, and only one of them is allowed in. A
required declaration makes them distinguishable. It costs an author one field
and it is the whole difference between this and the synthetic corpus.

Note what it does _not_ do: it does not make authored fiction second-class.
A fictional domain that says it is fictional is admissible content. What is
inadmissible is content that describes somewhere real while refusing to say
whether anyone read anything.

None of this reaches a player. Provenance lives in the record; no player-facing
surface states a source.

## What the boundary now admits

`assertProductionCatalogBoundary` was a count of zero. It is now a count of the
_undeclared_: a definition in the world's catalogue that no loaded pack accounts
for. The failure text changed with it, from "policy domain" to "unsourced policy
domain".

This is a narrowing, not an opening. Before, any policy content failed the
check. Now, policy content that came from a pack with a declared provenance
passes and everything else still fails — including content spliced directly into
a world, which is precisely the tampered-save case the boundary exists for. The
metric, mechanism, incident and mortality catalogues are untouched and still
empty.

## What the loader refuses, and how

Loading never throws for content. A row that does not resolve is rejected by
name, with its reason, and the rest of the load continues. This is the
fail-soft rule the project applies everywhere: unknown content is skipped with a
stated reason, never refused whole and never silently dropped.

Refused, by name:

- a pack with no provenance, or a `sourced` provenance naming no source — the
  whole pack, since the declaration covers every row in it
- a key containing a colon, which is the pack/key separator
- a duplicate key within a pack
- an issue naming a domain, a proposition naming an issue, or a subject naming
  an `about` that no pack loaded before it declares
- a proposition with no question
- a technical subject that names an `about`

References resolve backwards only: a pack may name what an earlier pack
declared, and a row reaching forward is rejected rather than deferred. A bare
key means the pack's own; a qualified `pack:key` names another's.

The one case that throws is two packs claiming the same name, because a
registry cannot be built at all if pack names are not unique.

`describePolicyLoad` renders the report, so a modder sees what loaded and what
did not and why, rather than a shorter catalogue than they expected.

## What happens when the director's content comes back as prose

The research and design direction returns answers as prose, not as pack files.
Nothing in this design assumes otherwise, and nothing here should tempt anybody
into an automatic conversion.

A returned answer is read by a person and authored into a pack by hand, with the
provenance the answer actually supports: `sourced` with the documents it cites
when it cites documents, `authored-fiction` when it is a design judgement about
how something should feel. Those are different declarations and the difference
is the point. A design judgement laundered into `sourced` because it arrived in
a document with citations in it would rebuild the synthetic corpus one
well-intentioned row at a time.

There is deliberately no prose-to-pack importer. A renderer that turned an
answer into rows would be inventing keys, splitting questions and choosing
domains, and every one of those is an authoring decision with no fact behind it.

## Owed

A `DECISION-LOG.md` entry recording the pack-and-provenance choice. It is not
written yet on purpose: the log is one file, several lanes are merging tonight,
and an appended entry is a merge conflict on a branch train that is meant to be
clicked through quickly. It follows once the train is clear.

## Where the code is

- `src/simulation/policy-packs.ts` — row types, provenance, `loadPolicyPacks`,
  `qualifiedPolicyKey`, `describePolicyLoad`
- `src/simulation/policy-pack-registry.ts` — `POLICY_PACKS` (empty),
  `loadedPolicyRegistry`
- `src/simulation/production-catalog.ts` — `createProductionPolicyCatalog`,
  `assertProductionCatalogBoundary`
- `src/simulation/policy-packs.test.ts` — 15 tests over the refusals above
