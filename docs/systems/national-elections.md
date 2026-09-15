# National electoral resolution

Authority: SYSTEMS30 shared instructions and S30-N. This is a supplied canonical
result boundary and its current schedule/work consumer, not a complete
presidential campaign or a voter forecast.

## Dated source baseline

The [NARA allocation](https://www.archives.gov/electoral-college/allocation)
expressly supplies the 2020-census allocation for **2024 and 2028**, totaling
538 electors. It distinguishes winner-take-all states from Maine/Nebraska
(two statewide electors plus one per district), and DC's three electors.
`nara-2020-census-v1` is recorded on each national election. Other cycles
refuse until a new dated source version is admitted. Updating a repository
source does not rewrite saved election records.

The [Twelfth and Twentieth Amendments](https://www.archives.gov/founding-docs/amendments-11-27)
together with [Article II](https://www.archives.gov/founding-docs/constitution-transcript)
supply the four-year term, separate presidential/vice-presidential ballots, majority of electors
appointed, House state-delegation choice from the constitutional presidential
list, Senate individual-member choice from its distinct list, and January 20
noon term boundaries. In this complete-appointment baseline the majority is 270. House quorum is 34 states and choice requires 26 of all 50 states; DC has
no House delegation vote. The baseline Senate requires an explicit 100-member
canonical membership snapshot: quorum 67 and choice 51, never majority of
members present. Vacancies, excluded appointments, cutoff ties, disputed
returns and unsupported succession are precise receiver/refusal boundaries.

The [NARA timeline](https://www.archives.gov/electoral-college/key-dates) and
[current 3 USC chapter 1](https://uscode.house.gov/view.xhtml?edition=prelim&path=%2Fprelim%40title3)
ground the election-day/elector-meeting/congressional-count calendar. This
adapter uses the existing **date-level** due-item contract for election and
count days; it does not claim an exact sub-day congressional session model.
Term possession uses the existing zoned minute-level clock and the actual
recorded qualification/oath instant at or after the January 20 noon boundary.
Baseline reviewed 2026-09-13; new rules/session-date overrides need an explicit
version rather than silent inference.

[Maine's presidential counting law](https://legislature.maine.gov/legis/bills/bills_129th/chapters/PUBLIC539.asp)
requires its ranked-choice result. The national boundary therefore consumes a
**supplied lawfully resolved certification winner**, separate from raw totals.
The generic Maine result importer deliberately supplies no allocation winner.
It implements neither ranked-choice counting nor a national-popular-vote
compact. Raw totals alone cannot certify or appoint anyone.

## Canonical records and entry

`national-election-types.ts` declares optional JSON-safe histories integrated
with the existing contiguous append sequence, entity availability and snapshot
integrity. Missing fields on older Worlds remain absent. National records are
public supplied-result records, not private campaign support or observations.

1. Register the national election with existing Person IDs, distinct ticket
   roles, declared inhabitant-state facts and explicit provenance. The national
   jurisdiction has its own canonical identity; local residence is unchanged.
2. Supply unit results directly through `appendNationalRecord`, or bind an
   existing producer with `scheduleNationalUnitContest`. Unit scheduling uses
   the existing direct-contest scheduler at the national baseline date and
   verifies the selected canonical state/DC jurisdiction. District result keys
   are electoral units, not evidence of candidate home-district membership.
3. `importNationalContestResult` imports exact canonical contest tallies with
   their source ID and date/office/unit/jurisdiction checks. The current campaign
   registry's linked-unit handler imports an existing supplied result on ordinary
   time advance. Missing results **refuse**; the legacy seeded contest placeholder
   is never called for linked national units. No campaign committee is created,
   replaced, closed or funded by this adapter.
4. Supply the actual certification disposition and lawfully resolved unit winner.
   Contested, missing or unresolved certification does not allocate electors.
5. Record distinct explicit elector-slot ballots, including presidential and VP
   choices, acceptance/contestation and provenance. Appointment never fabricates
   how an elector voted. The same elector cannot be counted twice. The inhabited-
   state restriction is checked independently of ticket allocation.
6. `scheduleNationalCount` registers the existing due-item handler. It counts
   ready canonical inputs on the count day, or records a specific blocked state.
   A blocked reminder remains history; a later explicit `recordNationalCount`
   can consume newly supplied inputs without reopening that closed due item.
   Count records name the exact ballots and freeze their inputs. Duplicate
   counts and post-count result/certification/ballot changes refuse.
7. No-majority offices remain distinct. A count receiver supplies the lawful
   constitutional choice lists; validation refuses higher-count exclusions and
   unresolved cutoff ties. `recordContingentChoice` checks the separate bodies,
   membership inputs, quorum and whole-body majority. It records an actual
   supplied vote, not a predicted member decision or a player recommendation.
   Missing choice lists/membership remain unavailable.
8. `planNationalOfficeTerm` names the office-specific final outcome and an
   explicit authored work-demand profile. Planning is not possession.
   `qualifyNationalOfficeEntry` requires the right chosen person/plan, an explicit
   actual qualification/oath disposition and authority provenance, at or after
   the term boundary and before its end. Missing eligibility/oath evidence is
   an input gap, never automatic success from winning.
9. The ordinary day and minute clocks consume qualified plans through canonical
   organizations/work relationships. Entry, refusal and expiry append term
   states; expiry ends that work. Death/acting-presidency/succession remains
   unsupported rather than extending an incumbent or awarding a replacement.

`projectNationalElectionResults` and `NationalElectionResults` show raw popular
counts (statewide once, never statewide plus district double counting), allocated
electors, separately recorded/countable ballots, actual count, office-specific
chosen person and possession. Missing count is displayed as Pending. No support
metric, media projection, candidate rating or election probability is generated.
The current feature-leaf browser proof consumes openly labeled supplied fictional
results. It is not an ordinary creator-to-presidential-campaign proof.

## Exact remaining producer/receiver inputs

The current legislative campaign filing provider does not admit a presidential
campaign, state ballot access, party nomination, all-unit result production,
certification officials or elector selection. S30-N preserves that owner and
provides the bound result/schedule interfaces rather than inventing those inputs.
S30-S confirms its current increment supplies no canonical congressional seat/
membership producer; authored story rosters must not become Senate membership.
Contingent fixture tests use an explicit fictional 100-member canonical-person
snapshot, not an ordinary congressional route. Qualification/oath dispositions
are trusted authored/source adapter inputs; this increment adds no player power
to certify an election, choose for Congress or swear themselves into office.

A owns the ordinary Politics/results and opening-holder reader mounts. The exact
adapter is in the S30-N handoff; no shared PlayerGame edit is made in this owner.
Installed delivery, integrated entry and human visual acceptance remain separate
from the tested domain/schedule/work capability.
