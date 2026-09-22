# The drafting table, and what the empty catalogue does not cost

Walked 2026-09-22 09:05Z on `main` at `4595878e`, in Chromium 141. One life,
forty years old, made through the creator's custom route with the Legislative
staff start, in Nebraska. No fixtures, no injected records, no developer
menu.

This is the follow-up the policy-catalogue walk left open: what the bill
lifecycle does when the policy catalogue is empty. The answer corrects the
question.

## The finding

**A bill has plenty to be about. It is the player's opinions that have
nothing to be about, and those are two different absences.**

The claim carried between lanes — that the bill lifecycle "has nothing to be
about" because the policy catalogue is empty — is wrong as stated. Pressing
**Start a new bill** opens a drafting table offering more than forty
templates across eighteen subject families, each with a kind and a
one-sentence description of what it does:

Transit access · bridge and culvert maintenance · broadband access · water
service lines · appropriations · sunset and repeal · charges and dedications
· assistance eligibility · reporting and oversight · public posts · recovery
in designated areas · utility resilience · critical infrastructure assistance
· education facilities · health service capacity · environmental monitoring ·
procurement disclosure · social-service application access · agricultural
conservation assistance · veteran transition referrals.

The kinds are distinguished and the distinctions are the real ones: program
authorization, regulatory requirement, appropriation, revenue measure,
eligibility amendment, reporting and oversight duty, position authorization,
sunset or repeal.

## What choosing one actually produces

Choosing "Broadband access — buildout to unserved areas" does not produce a
label. It produces a drafted Act, in sections, with the parameters exposed as
things the player can change:

- Buildout authorization — $18,000,000
- Unserved below download speed — 25 megabits per second
- Standard the recipient must meet — speed and a latency ceiling

Under that, an **as offered / as you would file it** comparison laid out
section by section — purpose and construction, eligible areas, service
standard and reporting, buildout authorization — with the statutory language
written out in both columns so an edit shows as a difference. The text reads
like drafting rather than like flavour:

> An area is eligible for an award under this Act if no provider offers
> service in that area at a download speed of 25 megabits per second or
> greater. An area's eligibility is determined as of the date the award is
> made.

> A recipient of an award under this Act shall deliver the download and
> upload speeds stated in its award agreement and keep round-trip latency
> below the ceiling stated in that agreement, and shall report annually on
> its performance against that obligation. Failure to report is itself a
> breach of the award agreement.

And it says the thing a civics game has to say, twice, unprompted:

> Program authorization. Creates a program and states the most it may spend.
> Stating a ceiling is not the same as providing the money.

## It refuses to file, and it says exactly why

A legislative-staff life cannot introduce a bill, and the screen explains the
distinction rather than greying a control:

> Filing requires a supported member seat. This character holds no active
> legislative member seat. Staff may prepare a draft, but an office job does
> not authorize introduction.

That is the fails-soft rule working, on the most consequential screen in the
game.

## So what the empty catalogue does cost

The narrower claim stands, and it is worth restating now that the wider one
is retired. A **policy proposition** is the key that three writers are filed
under — a private belief, a public position, a campaign promise — and with no
propositions none of them can be entered. That is the conviction layer, and
it is genuinely locked.

The legislation layer is not filed under propositions and does not need them.
A bill here is about a subject family and an instrument, which the templates
supply in quantity. So the honest sentence is that the player can draft a
broadband buildout Act in careful statutory language and cannot record that
they believe in broadband.

## The door to all of this is three states wide

Measured in the same session. The Legislative staff start is the route to the
drafting table, and it requires a legislative scenario. `BLUEPRINTS` in
`src/simulation/legislation-scenarios.ts` holds Kentucky, Nebraska and Alaska
and no other state. It is also statewide-only: choosing a town disables the
button, in those three states as well.

So the richest, most carefully written content found in any walk tonight sits
behind a choice available in three of fifty-one places, and only to a player
who declines to name a hometown. That is a surfacing problem of a different
size from the others.

## One more thing the same life found

The Campaigns tab, for this Nebraska life starting 5 January 2026, refuses to
let the character run:

> You can't run for office in Nebraska this early. The game knows Nebraska's
> rules for who may stand, but not whether they were already in force this
> far back, and it won't apply a rule to a time it can't place it in. A life
> that starts later may be able to run here.

The refusal is well written and honest about its own reasoning. What it means
for play is that this life, beginning on the game's ordinary start date,
cannot stand for a Nebraska seat because the game cannot date its own rule.

**Settled since, and it is not general.** Six town starts across six states,
written up in `what-you-can-run-for-2026-09-22.md`, give four different
answers and none of them is this one. Every one of the six could stand for
governor. The rule-dating refusal is its own narrow case, and this walk did
not isolate whether it belongs to Nebraska or to the statewide start.

## What this walk did not establish

- **Whether a seated member can file.** This life is staff. Reaching a seat
  needs an election won.
- **What happens after filing** — referral, readings, committee, vote. None
  of it was reached.
- **Whether the date refusal on Campaigns belongs to the state or to the
  statewide start.** Settled as not general; the remaining two variables were
  not isolated.
