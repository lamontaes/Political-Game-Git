# Proposal: a campaign changes what people know, not a share directly

Status: PROPOSAL, for review. Nothing shipped calls the module this describes
(`src/simulation/campaign-reach.ts`). No coefficient here is settled balance;
every number lives in one `PROVISIONAL` block so a reviewer can change them all
in one place and re-run the tests, which assert relations between situations
and never a magnitude.

## The defect

The shipped outreach function (`requestedGainBasisPoints` in
`src/simulation/campaigns.ts`) asks for a share of the contest directly:
`minutes × workers × 3 / 2` basis points, widened by a seeded 0.60–1.41 swing.
It never reads how many people live in the place. So ninety minutes with two
people asks for the same 1.62–3.78 points of a village and of a city.

Measured across four contrasting places (Albany KY, Alamo NV, Aberdeen MD,
Abingdon IL), five effort levels, five seeds each — `scripts/playtest/campaign-curve.ts`
on the playtest branch — the curves are indistinguishable:

- one afternoon a day: 74–78% support in every place;
- two afternoons a day: 98–99% support in every place;
- every effort above zero wins 5 of 5 in every place.

Working zero afternoons is the only way to lose. Lowering the coefficient moves
every curve together and leaves them identical to each other, so it does not
touch the defect. The model has to read the place.

## The chain

    time and people   ->  contact attempts
    contact attempts  ->  people reached, minus those reached before
    people reached    ->  people who changed their minds (which can be none)
    people changed    ->  a share of the electorate (a real divisor)

Each arrow can fail on its own:

- **Staff competence** changes how many attempts become contacts and how good
  the campaign's information is. It never buys votes.
- **Saturation**: a second afternoon in the same place mostly meets people the
  campaign already met, so a repeat contact is weighted below a first one. This
  is diminishing returns without a diminishing-returns term.
- **Persuasion** is a draw whose low end is slightly below zero, because being
  heard is not being persuaded — a bad conversation is a real outcome
  (Santoro et al. 2025). Advertising persuades far less per person than a
  conversation, and its small measured effects are not huge opposite effects
  cancelling (Coppock et al. 2020).
- **Favours and endorsements** are meant to resolve into one real consequence
  each — an introduction, a volunteer, an endorsement — not three blanket
  bonuses, and an endorsement's effect is distinct from a popular candidate
  attracting endorsements (Kousser et al. 2015). This module does not yet model
  them; it leaves the seam.

## Electorate size, and unknown

The last arrow needs a number the world does not hold. `electorateFromDemography`
defers to `readPlaceDemography`: where that reader has no population — a county
headcount standing in for a city, a split geography, a place with no series —
the electorate is **unknown**, and the model records the work but declines to
state a share rather than dividing by a guess. Unknown is not zero and it is
not permission.

Where a population exists, it is carried through and explicitly marked as *not*
an electorate: how many residents may vote is a separate fact the world does
not record. The arithmetic illustration from the research holds — ten net
preference changes are 0.2 points among 5,000 eligible people and 0.002 points
among 500,000 — and that is exactly the relation the tests assert, not a
selected conversion rate.

## What this is not

Not a merge, not a new shipped parameter, not a balance decision. A well-run
campaign can still lose and a weak one still win, on circumstance rather than an
imposed quota or a forced last-minute swing. The response ranges are owner
review.
