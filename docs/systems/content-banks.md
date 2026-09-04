# Declarative Content Banks and the Content Browser

The game's authored content already exists, in several places, each describing
itself in its own vocabulary. Formative situations live in
`character-history.ts`, conversation subjects in `conversation-subjects.ts`,
measures in `legislation-scenarios.ts`, institutional procedure in
`legislature-rule-packs.ts`, the ordinary week in `ordinary-life.ts`, and the
personality, policy, metric, causal, incident and mortality definitions in their
own catalogs. That is fine for the code that runs each of them and no help at
all to a person asking what content this game has, where it came from, and what
has to be true before a player ever sees any of it.

`src/content/` is where that question has an answer. It is a _description_ of
authored content, not a second place to author it, and not a second engine.

## What this layer is not

- It does not hold simulation truth. Every fact it reports is read from the
  bank that owns it.
- It does not select content. There is no candidate list, no scoring and no
  scheduler here. Selection stays where it already is.
- It does not author anything. No situation, line, measure or definition was
  written to fill this out.
- It does not migrate the banks. The banks stay where they are, keep their own
  shapes, and keep their own stable keys.
- Nothing player-facing imports it, and nothing in `src/simulation/` or
  `src/presentation/` may import it. The dependency runs one way, and a test
  asserts it.

## The contract

`ContentBank` is a bank read through an adapter; `ContentItem` is one thing in
one bank. A bank id is a stable dotted content key, checked with the
repository's existing `assertDottedContentKey` rather than a second rule written
here. An item id is `${bankId}/${itemKey}`, and `itemKey` is whatever the source
bank already calls the item — a dotted situation key, a plain subject slug, a
rule-pack id, a catalog stable key. Renaming existing content to satisfy this
index would be the index changing the game, which it must never do.

Each item reports:

- **domain** and **thread/family** — where it sits;
- **authority** — where its claim to exist comes from;
- **status** — where it can be reached;
- **life stage**, **speaker/role requirements**, **prerequisites**, **required
  canonical facts**, **variable/name slots**, **options** and **follow-up
  hooks**;
- **tags**;
- **provenance** — the source module and exported symbol, plus the citation,
  URL, retrieval date and verification status where the bank carries them.

### Authority

Read from the repository rather than invented.

| Authority           | What it means                                                                 | Where it is true today                                               |
| ------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `sourced`           | Compiled from a cited instrument, with retrieval date and verification status | Legislative rule packs                                               |
| `authored`          | Written for the game on purpose, claiming to describe nowhere real            | Formative situations, ordinary life, conversation subjects, measures |
| `synthetic-fixture` | Built to exercise the engine, kept out of players' saves                      | The synthetic catalogs                                               |
| `unestablished`     | Deliberately empty because no sourced content exists yet                      | The production catalogs                                              |

### Status

`production` means ordinary play can reach it. `development-only` means only a
development route or fixture can. `excluded-from-production` means an invariant
actively keeps it out of a player's world — which is exactly what
`assertProductionCatalogBoundary` does to the synthetic catalogs.

### Declared and undeclared

Every list-valued dimension is a `ContentFacet`: either `declared`, with the
bank's own values, or `undeclared`, with the reason the bank says nothing.
There is no third state and no default, because an index that quietly invents a
prerequisite is worse than one that admits it does not know: the invented one
reviews as fact.

Undeclared is not a gap to be filled by this layer. It is a finding. Two of
them are worth naming:

- **Formative eligibility is procedural, not declarative.**
  `formativeEligibilityProvider` answers whether a character is at a school, has
  a job, or is in a recorded household by evaluating a world. Restating that
  here as declarative prerequisites would be a second copy of a rule, free to
  drift from the one that runs, so the index names the provider instead.
- **A conversation subject's intents cannot be read without a world.**
  `availableIntents(world, room, addressee, progress, …)` produces them, and the
  sentences a turn records are closures over those intents. There is no
  enumerable list to index. Making one declarative is a change to the
  conversation bank, not something this index may do on its behalf.

## Registry and adapters

An adapter is a `() => ContentBank`. `ContentBankRegistry` calls each one,
validates what comes back, and sorts banks and items by their own ids so the
index is the same on every run and in every registration order. Registering a
bank later — from legislative bargaining, from a wider content pass, from
anywhere — is one adapter and one line in
`src/content/adapters/index.ts`. Nothing about the contract has to move.

Nothing anywhere counts. There is no expected number of banks and no expected
number of items in one; the tests assert that the index says exactly what its
bank says, so authoring one more situation is never a test failure.

## Export

`exportContentIndex` produces a deterministic Markdown review report and a
deterministic machine-readable JSON document from one read. The JSON goes
through `canonicalJson`, for the same reason the world snapshot does: key order
is not content. Both carry a `contentDigest` — a stable hash of the whole index
— so two reports can be compared at a glance.

Two ways to run it:

```bash
npm run export:content -- content-export
```

writes `content-index.md` and `content-index.json`; the Content Browser's export
button hands the same two files to the reviewer's browser.

## The Content Browser

`?view=content` is a development route, alongside the developer viewer, the
character proof, the legislation workspace and the office fixture. It holds no
world, starts no game, and cannot change anything.

It answers, by search and filter across domain, thread/family, life stage,
speaker/role, authority, status, tag, content id, whether prerequisites are
declared, and which dimensions a bank leaves undeclared:

- what content exists;
- where it came from;
- what can trigger it;
- what canonical facts it requires;
- what slots and options it exposes;
- what follow-up hooks exist;
- and whether a player can reach it at all.

It is deliberately unreachable from ordinary play. Nothing in the player shell
links to it or imports it, and both facts are asserted by test.

## Currently out of scope, with the reason

- **`run-b-conversation.ts` dialogue and `run-c-working-document.ts` variants.**
  Both are world- and state-dependent renderings rather than banks: the office
  dialogue is written per phase and per role from a live room, and the Run-C
  working document is a single fixture document with two authored cap variants
  built by `createRunCFixture`. Indexing either would mean constructing a world
  to read content, which this layer must not do.
- **`run-a-learning.ts`.** One civic concept id and a storage key; there is no
  bank there to index.
- **Names, appearance components and art assets.** Owned by other lanes and
  outside this lane's path ownership.
