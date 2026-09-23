# How big is the game — a census

**Counted:** 2026-09-22 at `1cfd620e` (branched from main at `1c4992e8`), by
importing the live registries rather than grepping, except where a line says
otherwise. Asked for by lamontae: "I'm also just interested in the number of
things… I'm trying to see the size of the game."

Two columns matter and they are not the same: **what exists** and **what a
player can reach**. Where they differ, that gap is the finding.

## Places and offices

|                                                 | Count      |
| ----------------------------------------------- | ---------- |
| Places a life can start in                      | **35,582** |
| Candidacy packs (states with filing rules read) | **9**      |
| Offices a player may file for, nationwide       | **17**     |

Seventeen offices across nine states, against 35,582 places. Every office is a
state legislative chamber; there is no mayor, no council, no county seat
anywhere in the game. The governorship is a separate route with its own rules
and reaches all fifty states.

## The drafting table

|                                                | Count                              |
| ---------------------------------------------- | ---------------------------------- |
| Program families                               | **20**                             |
| Program configurations (family × variant)      | **43**                             |
| Standing authorities                           | **4**                              |
| Legislative scenarios, statewide               | **3** (Kentucky, Nebraska, Alaska) |
| Legislative scenarios including local variants | **9**                              |

The twenty families: transit access, bridge maintenance, broadband access,
water service lines, appropriations, program sunset, service charges,
assistance eligibility, agency reporting, public workforce, disaster recovery,
utility resilience, critical infrastructure, education facilities, health
service capacity, environmental monitoring, procurement disclosure, social
service access, agricultural conservation, veteran transition referrals.

This is the deepest catalogue in the game and it is reachable in three states.

## Convictions

|                         | Count   |
| ----------------------- | ------- |
| Policy packs            | **1**   |
| Policy domains          | **13**  |
| Policy issues           | **127** |
| **Policy propositions** | **0**   |

A hundred and twenty-seven issues and nothing to believe about any of them. A
player can draft a broadband Act in sections with its parameters exposed and
cannot record that they believe in broadband. `assertProductionCatalogBoundary`
requires the proposition count to be zero in a shipped save, so this is
deliberate and is the single largest gap between what exists and what a player
can do with it.

## People

|                                              | Count       |
| -------------------------------------------- | ----------- |
| Traits in the loaded registry                | **6**       |
| Decisions                                    | **3**       |
| Leans                                        | **3**       |
| People in a new world (with Congress seated) | **555–559** |
| People without Congress                      | **20–25**   |

Six traits is the whole personality catalogue. A mod cannot add a seventh: the
registry calls `loadTraitPacks` with a literal array of two compiled packs and
`RuntimeContentPack` has no trait field.

## Crises

|                                       | Count                                        |
| ------------------------------------- | -------------------------------------------- |
| Crisis record kinds                   | **21**                                       |
| Hazard families                       | **2** — flood, severe storm                  |
| Hazard magnitudes                     | **4** — minor, moderate, major, catastrophic |
| Assassinations possible in play       | **0**                                        |
| International crises possible in play | **0**                                        |

The twenty-one kinds: authored, condition-pack, counterparty-response,
crisis-decision, crisis-options, disaster-assessment, disaster-damage,
disaster-response, hazard-episode, health-disclosure, health-episode,
health-state, injury, intelligence-assessment, international-crisis,
mortality-calibration, mortality-window, official-continuity, repair-progress,
violence-attempt, war-powers.

**Two hazard families.** Every natural disaster in the game is a flood or a
severe storm. No earthquake, no wildfire, no drought, no heat event — the
compiled NOAA catalog behind it carries those categories in reality; the game's
type does not. Four magnitudes on two families is eight distinct kinds of
natural disaster, before geography.

**The two zeros are the interesting ones.** `violence-attempt` is written by
exactly one function, `recordViolenceAttempt` (`crisis/international.ts:929`),
and `international-crisis` by exactly one, `declareInternationalCrisis`
(`:237`). Both have zero callers outside tests, as does
`certifyWarPowersExtension`. So an assassination and an international crisis
cannot happen in an ordinary save. Meanwhile `decideInternationalCrisis` **is**
wired, from `player/CrisisNoticesPanel.tsx:307` — the player's panel for
deciding an international crisis is connected and nothing can start one.

Found first by the divergence lane from the law side; verified here
independently from the crisis side.

**Re-verified 2026-09-22 at the level the method below demands**, after the
divergence lane paid for the same class of mistake on the scandal chain: every
top-level export of `crisis/international.ts` was checked for callers outside
that file, its tests and the registry, not only the two writers. Fourteen
exports; exactly three have any outside reference —
`internationalCrisisState` (2), `decideInternationalCrisis` (2) and
`pendingInternationalDecisions` (4). All three read or decide. Neither writer
has one, and every scheduling of `crisis:international-decision`,
`crisis:international-response` and `crisis:war-powers` happens inside
`international.ts` itself, reachable only from those dead writers. So the chain
has no entry point anywhere in the game.

### A correction on my own method, recorded because it nearly went in

My first pass grepped for exported writer functions and reported zero callers
for `recordDisasterAssessment` and `recordDisasterResponse` too. That was
wrong: those records are written inline inside `disaster.ts` rather than
through an exported writer, and the divergence lane has **measured** 12
assessments and 36 responses in two years of one save. A name-based grep on a
writer is not a reachability instrument.

The divergence lane hit the same class of error from the other side and it is
worth stating as a rule, because it has now cost two lanes: they reported that
a scandal cannot start, having checked `recordAllegation` and `fileComplaint`
for callers, when the chain is entered two functions above them at
`pressWeeklyHandler` → `produceRivalComplaints`. **A caller check starts at a
file's top-level exports, never at the writer.** The three international zeros
survive because that check was redone that way, above.

Also settled by the divergence lane's measurement, which my reading could not
answer: an ordinary new save **does** schedule hazard samples with no player
action — 12 hazard episodes by year 2, 20 by year 4, 26 by year 6 in one
Kentucky life. The hazard system runs.

## Parties

A new party organisation **is founded on its own** in an ordinary save with no
player involvement — measured by the divergence lane at year two. So the
founding half of a third party is not hypothetical.

What happens next is nothing. `partyBallotStatusAt()`
(`living-world/party-evolution.ts:417`) takes no arguments and returns the
literal `"not-represented"`, and a grep across all of `src/` finds **zero
callers**, the UI included. So the answer to "can the United States get a true
third party" is not that the game says no. It is that nothing ever asks. A
founded party's ballot status never reaches a screen.

## What this adds up to

The counts that are large — 35,582 places, 127 issues, 43 program
configurations, 21 crisis record kinds — are mostly catalogue. The counts that
decide what a life can contain are small: 17 offices, 6 traits, 2 hazard
families, 0 propositions, 0 assassinations.

That is the same shape as
`docs/playtest/reachable-and-empty-2026-09-22.md` found on the surfaces, from a
different direction: the game is bigger than it plays.
