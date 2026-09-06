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

Every value is a transcription, and the compiler is deliberately unconvinced
twice over:

1. an authority is retrieved by `source:acquire`, and its bytes are hashed and
   pinned in the domain's artifact lock;
2. the lock's rights determination declares which spans of that capture are
   enacted text, and the capability layer cuts those spans before a compiler
   sees anything — see [Rights](#rights);
3. a declaration in `src/source/domains/state-legislatures/declarations.ts`
   names a value, a citation with a pinpoint, the **verbatim excerpt** it was
   read out of, and the **closed proof** under which that excerpt establishes
   the value;
4. at compile time the excerpt must be literally present in the enacted text of
   the locked bytes, and the proof must hold;
5. anything that fails is a compile defect naming the state, the chamber and the
   sentence. It never degrades quietly into UNKNOWN.

### Why the proof is a contract and not a search

An independent adversarial pass defeated an earlier check that looked for the
declared value inside the quoted sentence. All three of these compiled:

- California's Senate at **twenty** seats, out of "The Senate has a membership
  of 40 Senators elected for 4-year terms, 20 to begin every 2 years" — twenty
  is the staggered cohort, and it is in the sentence;
- Minnesota's senators as **elected**, out of "Senators shall be chosen by
  single districts" — a districting rule containing an election word;
- Illinois' House at **118** with the one-member-per-district premise deleted,
  because 118 still appeared in the remaining transcription.

So each field is proved by its own contract, and the contracts are a closed
discriminated set rather than accumulating regular expressions:

| Field                    | Proof                                                             | What it requires                                                                                                                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `legislatureName`        | `instrument-vests-legislature-named`                              | the claimed name is the body the provision vests legislative power in                                                                                                                                                             |
| `chamber.name`           | `instrument-names-chamber`                                        | the provision names the chamber while composing something                                                                                                                                                                         |
| `structure`              | `legislature-composed-of-chambers` / `legislature-single-chamber` | the provision composes the legislature of the chambers the record carries                                                                                                                                                         |
| `chamber.seatCount`      | `chamber-membership-count`                                        | the membership clause following the chamber's **own established name** is parsed and the number it states is **read out and compared** — never searched for                                                                       |
| `chamber.membersElected` | `chamber-members-elected`                                         | a declared clause naming who is elected, bound to the chamber by a declared member noun or by the chamber's name standing ahead of it, and stating election — where the sentence names an agent, that agent must be an electorate |

A range ("not more than forty") and an open-ended count ("35 members, plus such
additional members as shall be provided under Section 2A") state no membership,
and the reader returns nothing for both.

`DERIVED` covers facts a step away from the words, and names a closed derivation
kind that validates **every** premise:

- `seats-equal-one-member-per-district` — needs the district count _and_ the
  one-member-per-district clause; Illinois loses 118 if either goes;
- `election-by-district-electors` — Delaware and Idaho say "chosen, by the
  qualified electors", which is election without the word;
- `two-chambers-composed-separately` — Virginia composes a Senate in § 2 and a
  House of Delegates in § 3, and neither sentence alone says there are two.

### Provenance binding

A record's jurisdiction is never inferred from an artifact id, because an id is
a name a declarer chooses: the audit relabelled a California record as Kentucky
and invented a `ky-*` id to match. Every transcription must instead

- name an artifact in this domain's **locked acquisition lineage** — the closed
  list in `acquisition.ts` of authorities this domain declared it retrieved, so
  renamed or repackaged material from an unaccepted research wave has no route
  in and no blocklist of names has to be maintained;
- come from an artifact whose **own locked jurisdiction** is the record's;
- state the **instrument title the locked artifact declares**, so a citation
  cannot rename its own instrument;
- carry a locator appropriate to the instrument. "Official publication 2026"
  names a publisher and a year and leaves a reader nowhere to look.

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
would be false in the other direction. `ArtifactRights` therefore carries a
fourth status, `public-domain-government-edict`.

The doctrine is about the text of an enacted law. It is not about the web page
that carries that text, and a retrieved state constitution arrives wrapped in
navigation, search widgets, revisor's notes, annotation blocks, case citations
and a copyright footer. So the status is not a label with a sentence attached:
it is a structured determination (`GovernmentEdictBasis` in
`src/source/core/enacted-text.ts`) carrying the jurisdiction, the enacting
authority, the instrument kind and title, the doctrine as an enumerated value, a
content scope fixed at `enacted-legal-text-only`, and a deterministic boundary.

The boundary is a list of spans over the capture's normalized text, each
delimited by verbatim `beginsWith`/`endsWith` markers a reviewer can look up in
the published instrument, with the SHA-256 and length of what they cut out
pinned alongside. `openProductionArtifacts` verifies the publisher bytes against
the lock, then cuts the boundary, then checks the extraction against that pin,
and hands the compiler **only the extracted enacted text**. The mixed page is
never production-readable, and the captured bytes on disk are never edited.

Three consequences worth stating plainly:

- the status label alone opens nothing — a determination missing its boundary,
  or whose boundary no longer cuts what it pinned, is refused at the capability
  layer, not merely flagged;
- a placeholder fails structurally: `enactingAuthority: "x"` does not name an
  enacting body and is rejected;
- the publisher's annotations, headnotes and site furniture are outside every
  determination here, and their rights status stays UNKNOWN.

The captured bytes are immutable. `data/source/*/raw/**` is exempted from
whitespace checking by `.gitattributes` because the trailing whitespace in those
files is the publisher's; stripping it would break every digest, rights
determination and transcription resting on those bytes. Whitespace checking
stays on for everything this repository actually authors.

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
