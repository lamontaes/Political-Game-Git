# Elections

Elections are contextual contests among persistent people, institutions, geography, populations, and uncertain information.

## Rules

- A contest belongs to a jurisdiction, office, institutional ruleset, electorate, and time period.
- Candidates remain people before and after the contest.
- Voters may be simulated through scalable populations or coalitions; geography and demographic change matter.
- Campaign effects arise from actions, messages, resources, events, candidates, relationships, media, and conditions rather than universal bonuses.
- True support and exact outcome probabilities are not exposed to players or NPCs.
- Polls are fallible observations shaped by timing, sample, method, nonresponse, turnout assumptions, and bounded randomness.
- Recruitment, fundraising, staff, volunteering, speeches, forums, endorsements, and media must operate through substantive context.
- Losing is a continuing life state, not game over.
- Observer Mode uses the same election systems without a player character.

## What is implemented

A contest, a campaign for it, and a first election a player can reach. The
Stage 4 character-mind and decision architecture remains a future input to
candidate, voter, staff and endorsement choices; it does not yet drive any of
them.

### The contest

`src/simulation/election-contests.ts` owns the contest: a jurisdiction, an
office, a date, a candidate list, and a result with per-candidate tallies. It
schedules itself through the future-transition substrate and fires on the
ordinary time advance, so election day arrives because the world reached it
rather than because a screen offered a button. The day panel, adult choices,
quiet stretches and episode choices all carry the existing composed
campaign/life future-transition registry; ordinary-life callbacks remain in it.

### Which offices exist, and on whose authority

`src/simulation/candidacy-packs.ts` derives elective office options from the
accepted legislative rule-pack registry. The offer attributes the recorded
seat count to the pack; it does not attach a procedural citation as proof of
that count. Candidate-qualification and membership-instrument gaps remain
explicit. `candidacy.ts` resolves which pack governs a resident. Nothing
further is claimed:

- **Candidate qualifications are `unknown`.** No accepted source in this
  repository states a minimum age, a residency requirement, a term length or a
  filing deadline for any office. The packs describe how a measure moves through
  a chamber, not who may stand for a seat in it. Those values are carried as
  `unknown`, never defaulted.
- **The game applies its own adult rule instead, and labels it as its own.** A
  character under 21 is turned away by the game, which is a different sentence
  from "the law says no", and the refusal says which it is.
- **No district is claimed.** There is no district geography, so a contest is
  for a seat in a chamber and `seatKey` is `null`.
- **The pack is resolved through declared jurisdiction identity, never supplied
  by the caller.** A locality can reach its own parent-state pack through
  `stateJurisdictionKey`. A Lexington resident can therefore stand for a
  Kentucky legislative seat; Lexington's own municipal capabilities stay null.
- **No local or parent-state pack means no candidacy.** Unsupported localities
  retain ordinary life. Negative controls derive missing coverage from the
  accepted pack registry instead of freezing a named state as unsupported.

### The campaign

`src/simulation/campaigns.ts` owns candidacy and campaign truth, and builds
nothing that already exists:

- the **committee** is an organization, and its **treasury** is an ordinary
  resource position that the organization owns — not the candidate, and not a
  second wallet;
- an **afternoon of campaign work** is a scheduled activity that costs the hours
  it costs and can be blocked by a commitment the character already made;
- **money** moves as resource flows and transfer outcomes, so an advertising buy
  cannot overdraw the committee's account;
- **support** is a world metric, one segment per candidate in the contest.

Three kinds of work, so the choice is a real one: an afternoon on the phones
turns time into money, an afternoon on the doors turns time into support
directly, and an advertising buy turns money back into support without the
candidate being in the room. The size of an effect comes from how many people
worked, for how long, and how much was actually spent, with seeded variation on
top. None of it is a flat bonus per click.

### Support truth, and what the campaign is told about it

This is the distinction the whole system is built around.

- **Canonical support** is a world metric state. It decides the election. It is
  shown to nobody.
- **The field memo** is a world metric observation of that state, wrong by a
  deterministic amount drawn from the seed, carrying a stated four-point margin
  it can and does exceed.

They are separate records with separate meanings. `src/simulation/index.ts`
names its campaign exports one by one so `canonicalSupportBasisPoints` is not
re-exported, and the presentation and player layers — which import from that
barrel and nowhere else — cannot reach it even by accident. Tests assert both
the omission and that no number on the player's screen equals the truth.

The memo reaches the player only when the world records the candidate having
been told: the projection reads the knowledge record, not the observation.

### The result, and the morning after

The election resolves from canonical support with a bounded keyed swing, so
campaigning improves the odds without deciding the outcome. Across ten seeds,
one wins having done nothing and six win after three afternoons on the doors.

- **Losing** closes the committee, ends the work it created, writes itself into
  history, and leaves the character in the life they were living. It is not an
  ending, and the surface says so in those words.
- **Winning** seats the member through the ordinary work records — an
  organization, a work relationship, a role in a jurisdiction — which is what
  opens the existing office and legislative surfaces where available. The
  seated organization and role use the governing state identity resolved from
  the accepted pack, while the person and household retain their residence.
  Kentucky work therefore remains Kentucky work for a Lexington resident,
  including after save/reload. States without an existing playable legislative
  surface receive no new surface from this identity correction.

## What is not implemented

- Primaries, party nomination, ballot access, and campaign finance rules. A
  filing is a general-election candidacy and nothing more.
- Any candidate qualification, term length, or filing deadline, for any office,
  anywhere — see above.
- District geography, and therefore any contest for a numbered district.
- When a term begins. No pack states one, so the seat is taken up on the day the
  result is recorded, and the gap is recorded rather than dressed up as a rule.
- An electorate. Support is a bounded share rather than a modelled population,
  and the supporter pool and the advertising vendor are aggregate counterparties
  rather than a donor database or a media market.
- Endorsements, staff recruitment, forums, speeches, and media as systems. A
  campaign currently runs on the candidate alone.
- Contests for any office outside the accepted legislative rule-pack registry. Candidacy
  coverage and playable legislative-work coverage are separate boundaries.
- Any NPC standing for office on their own initiative. An opponent is
  materialized when a player files, and does not campaign.
