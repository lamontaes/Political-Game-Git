# State elective-office identity (source domain `state-legislatures`)

## What this is

The smallest true thing that has to be known before a resident of any Census
place can be told which state seats exist above them: that their state has a
legislature, whether it sits in one chamber or two, what those chambers are
called, how many seats each holds, and whether their members are elected.

Fifty records, one per state, keyed `US-XX` — the same key
`LegislativeRulePack` and the candidacy layer already use.

## What this is not

It is **not** `LegislativeRulePack` coverage and must not grow into it.

A rule pack says how a bill moves through a chamber: origination, referral,
committee reports, concurrence, veto. Five states have one, because five
states' worth of chamber procedure was read. Fifty states have a legislature.
Knowing that Ohio's general assembly has two chambers is a far smaller claim
than knowing how an Ohio bill is referred and reported, and treating the second
as a precondition for the first is what currently confines candidacy to five
jurisdictions.

It also carries no candidate qualifications, filing deadlines or fees, district
geography, primary or nomination rules, term lengths or limits, compensation,
campaign finance, or officeholders. Those are other domains' facts. The
validator fails the build if a field named for any of them appears here.

## How a fact gets in

Every value is a transcription, and the compiler is deliberately unconvinced:

1. an authority is retrieved by `source:acquire`, and its bytes are hashed and
   pinned in the domain's artifact lock;
2. a declaration in `src/source/domains/state-legislatures/declarations.ts`
   names a value, a citation with a pinpoint, and the **verbatim excerpt** it
   was read out of;
3. at compile time the excerpt must be literally present in the locked bytes,
   and the excerpt must actually carry the value — a seat count must appear in
   its own sentence as digits or as the English cardinal, a chamber name must
   appear in the sentence naming it, an `elected` claim must rest on a sentence
   with an election word in it;
4. anything that fails is a compile defect naming the state, the chamber and
   the sentence. It never degrades quietly into UNKNOWN.

`DERIVED` covers facts that are a step away from the words — Illinois fixes 118
Representative Districts in one section and elects one Representative from each
in the next — and must quote every provision it rests on and state in words how
the value follows.

## What is UNKNOWN, and why that is the point

A state whose authority could not be retrieved carries UNKNOWN values and an
`unresolvedGaps` entry naming what was attempted and what happened: a
client-rendered constitution page, a publisher that refuses a non-browser
client, a PDF this substrate has no parser for, an incomplete TLS chain. Those
are facts about a retrieval, never facts about the state, and nothing about a
state may be inferred from the states that were read.

Massachusetts is compiled as nothing on purpose: the Commonwealth publishes the
1780 text and two centuries of amendments in one document, the composition
provisions are amended more than once, and this domain did not resolve which
governs. Emitting either number would state a superseded rule as present law.

## Rights

State constitutions are not works of the United States government, so
`public-domain-us-government` would be false for them, and the edicts doctrine
is a positive determination rather than an absence of information, so `UNKNOWN`
would be false in the other direction. `ArtifactRights.status` therefore carries
a fourth value, `public-domain-government-edict`, with a mandatory `edictBasis`
naming the enacting body and the doctrine. It covers the enacted text only,
never the publisher's navigation or annotations, and it may never be reached by
inferring that something was publicly reachable.

## Commands

- `npm run source:acquire -- --domain state-legislatures` — retrieve and pin the
  state instruments (the only command that touches the network)
- `npm run source:compile -- --domain state-legislatures` — compile the fifty
  records
- `npm run coverage:state-legislatures` — regenerate
  `data/source/state-legislatures/coverage.json` and
  [the coverage report](state-elective-office-identity-coverage.md)
- `npm run source:validate`, `npm run source:replay` — the substrate gates,
  which cover this domain by its existing

## The consumer this is for (not implemented here)

Today `candidacy-packs.ts` derives candidacy packs from `LEGISLATIVE_RULE_PACKS`,
so only a jurisdiction with full bill procedure can expose state legislative
seats. This domain exists to break that coupling. The intended mapping, once the
campaign/candidacy writer lands, is:

```
Census locality -> parent state US-XX -> state elective-office identity -> candidacy pack
Census locality -> municipal candidacy                                  -> UNKNOWN unless local research exists
```

A chamber becomes a candidacy seat only where this domain says its members are
elected, and a seat count that is UNKNOWN stays UNKNOWN in the pack rather than
being filled in from a neighbour or a national average.
