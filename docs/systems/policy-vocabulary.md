# The policy vocabulary: what government is about

The bill lifecycle is the deepest thing in this repository, and until now a new
world shipped with nothing for it to be about: no domains, no issues, no
propositions. That emptiness was deliberate and it is now over for the first
two of those. This document says what shipped, the one real contradiction in
the research behind it that had to be resolved, and what is still waiting on
the owner.

## What shipped

One pack, `us-state-and-local`, loaded through the existing
`policy-pack-registry`: **13 domains and 127 issues**, in ordinary American
government language. No propositions, no knowledge subjects and no political
principles, because those describe what could be _done_ about a question and
nothing yet decides that.

The pack declares itself `sourced` and names its sources — NCSL's bill-tracking
directory, the National League of Cities' 2025 and 2026 State of the Cities
reports, NACo's County Landscape and county-roles material, and NASBO's state
expenditure report. That declaration is what lets it past
`assertProductionCatalogBoundary`, which still refuses any policy content
arriving by another route.

## The contradiction, and which list was taken

Two overnight research runs published **different domain lists in the same
document**: one of 14 domains and one of 13. It is not a relabelling. In the
14-list, elections/democracy/ethics is its own domain and parks/culture/
community life is its own. In the 13-list, elections and ethics sit inside
government operations, and libraries and culture sit inside civil/family/
community policy.

**The 13-list was taken.** Three reasons, in order of weight:

1. It is the only one that carries issue rows. The 14-list is a list of
   headings; the 13-list enumerates the questions under each, which is the
   content actually needed.
2. The proposed state attention weights are keyed to its buckets — its
   "government operations/local-government/elections/ethics" appears as one
   9% entry, and the entries sum to 100 across its 13 plus an "other" bucket.
   Taking the 14-list would have orphaned the weights against a shape they
   were never computed for.
3. Its groupings follow where a bill actually travels. An election-
   administration bill is a government-operations bill in most legislatures,
   and it is referred accordingly.

**Where the 14-list is probably right, and what was done about it.** Elections
and ethics are the likeliest thing to want promoting to a domain of their own,
because this project has read ethics law in all 51 jurisdictions and that
research needs somewhere to land. So elections and ethics are not buried: they
are separate issue rows with their own stable keys —
`government-operations.election-administration`,
`government-operations.election-rules`,
`government-operations.ethics-and-disclosure`,
`government-operations.lobbying-regulation`. Promoting them later moves
existing rows under a new domain rather than minting new identities, which
keeps old saves readable. The same is true of `civil-family-community.libraries`,
`.arts-and-culture` and `.parks-and-recreation`.

## Levels are routing, not authority

Each issue carries the levels at which that question is ordinarily decided —
state, county, municipality or school district. Jails are county and prisons
are state. Zoning is county and municipal. Criminal sentencing is state.
Roads are all three, because all three own some.

Two things this is not:

- **It is not a claim about any particular jurisdiction.** That zoning is
  ordinarily municipal says nothing about whether _this_ city was granted
  zoning power. The jurisdiction's own capability record decides that. A
  county without zoning authority must not generate zoning fights because a
  national list has a land-use bucket.
- **An absent list means nobody established it**, and a consumer must not read
  that as "every level". An unknown fact is not permission. Every issue in
  this pack names at least one level, so nothing is currently relying on that
  rule, but the rule is what the type means.

The field is optional and is omitted rather than written empty. That is not
tidiness: five accepted-bytes fixtures failed when it was written
unconditionally, because the synthetic catalogue's issues carry no levels and
suddenly serialised an extra key. Omitting it means a world holding unrouted
issues produces exactly the bytes it did before the field existed, and a save
written before it stays readable. A test pins that.

## What is deliberately absent

**The attention weights.** The research proposes starting percentages for state,
county and city — 14% fiscal, 10% education, and so on. They are a **director's
proposal, not a measurement**, and the research says so plainly: no national
source measures state legislative, county board and city council attention on
one basis. NCSL's databases are topic-selective, NLC measures mayoral speech
content, NACo gives responsibilities and investment, NASBO gives spending, and
spending share is not agenda share. They are on the list of things needing
lamontae and they are in no source file. A test asserts that no percentage
appears anywhere in the loaded rows.

**Frequency of any kind.** A domain is not a crisis. A world with enough
housing should produce routine zoning and building-code work and no housing
emergency. What is salient should come from the world's own conditions,
standing programs, budget calendars and the goals NPCs actually hold.

**The synthetic catalogue is not a baseline.** `createSyntheticPolicyCatalog`
in `policy.ts` carries foreign policy and monetary policy. Those are federal,
it exists for demos and tests, and nothing in this pack inherits from it.

## Open for the owner

1. **The attention weights** — approve, amend, or say they should be derived
   from world conditions instead of a starting prior.
2. **Whether elections and ethics should be their own domain**, as the 14-list
   had it. Cheap to do; the issue keys were chosen so it stays cheap.
3. **A federal/national pack.** Foreign policy, monetary policy and Medicare
   are real policy and have no home in a state-and-local pack. They need their
   own, or a decision that the game does not go there.

## What this does not yet do

The vocabulary exists. Nothing generates from it yet: no world picks an issue
because of its own conditions, no NPC proposes about one, and no measure is
filed about one by anything but a player naming it. The join that would let a
measure name a proposition exists (`propositionIds` on a measure record), but
the propositions themselves do not, so there is nothing to name. That is the
next piece of work, and it needs the owner's answer on weights first, because
a generator without a prior is a generator that picks uniformly.
