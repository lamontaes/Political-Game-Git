# ALIVE43 ROLE W — World and Parties

Owning packet: ALIVE43 EXECUTION (Drive, 2026-09-15), sections SHARED CONTRACT,
SOURCE MAP and ROLE W. This plan records the executing seams and decisions; the
packet remains the authority for scope.

- Owner: W, Claude Code session `political-game-claude-runtime-proof-77`.
- Worktree / branch: `/private/tmp/pg-alive43-w`, `claude/alive43-w-world-parties`.
- Base: main `70d76fb940c8b4a81ebdd1ec5834f96b8cb288bd`.
- Receivers: L (`political-game-claude-runtime-proof-c9`, direct messages) and
  LAND (Codex; not reachable by SendMessage, so handoff is by pushed branch
  plus the ALIVE43 Drive folder).
- Contract: `alive43-world/v1` (`src/simulation/living-world/contract.ts`).

## Excluded

B's legislative binding (PR #260): `legislation-world.ts`,
`legislative-bargaining-*`, `run-a-projection.ts`, `legislation-drafting.ts`,
`legislation-scenarios.ts`, `measure-numbering.ts`,
`content/adapters/legislative-blueprints.ts`. L's readers and components,
`PlayerGame.tsx` (LAND), art/authoring (A), held people/compositor files (D).

## W1 — opening world and national parties

Writer: `ensureLivingWorldOpening` (`src/simulation/living-world/opening.ts`),
called once from `establishOpeningOfficeholders` for a new life only.

- 435 House seats from the Census Gazetteer 2025 district identities (50
  states; DC and Puerto Rico delegates are not chamber seats) and 100 Senate
  seats with classes from senate.gov's senators XML (fetched 2026-09-15, sha256
  recorded in `congress-seats.ts`). Terms start January 3 (Twentieth
  Amendment); House two years, Senate six; class rotation from senate.gov's
  Senate classes page.
- Every seat has a persistent fictional context person or a represented
  vacancy (`world.legislative-seat-tenure` / `world.legislative-seat-vacancy`).
  Members live in their seat's state and meet the constitutional minimum age
  at service start.
- Parties: `Democratic Party` and `Republican Party` as organizations (setting
  data), plus the four chamber caucuses. A member's publicly listed party and
  caucus are tags on the public seat-roll record, following the
  state-executive tenure precedent. Executives receive an explicit
  `affiliation:political-party` participation; the Chief Justice receives none.
  Participations are authoritative over roll labels once a person has any.
- Starting variation: `alive43-contemporary-us-v1`, an authored bounded
  setting (first-party share 44–56% of affiliated seats per chamber, 0–2 House
  and 0–3 Senate independents, 0–3 House and 0–1 Senate vacancies). It is not
  an empirical estimate. No regional partisan lean is modeled.
- Reader: `projectCongress`, `publicPartyAffiliation`, `caucusMembership`,
  `nationalParties` (simulation) and `projectWorldOrientation`
  (`src/presentation/living-world-orientation.ts`). Totals are derived on
  every read.
- Old saves: nothing is created on a read; `congress` is null and `parties` is
  empty until a separately tested enrichment exists (not in W1).

Decision recorded: the first design wrote a party and caucus participation
per member and one event per seat. It took 22–34 s per new life and produced a
2.2 MB save because each life writer commits with a full integrity pass. The
roll-tag design takes about 1.5 s and 1.4 MB and needs no shared store or
integrity change.

## W2 — local party chapter encounter (next)

Reuse organization participation, context people, scheduled activities
(tentative holds, decline, expiry through `passOrdinaryDays`) and venue
activity. A home-area chapter, a persistent organizer, an invitation produced
during time advance, explicit join/leave, and a later encounter with the same
person.

## W3 — background developments (after W2)

Registered future-transition handlers composed into
`createCampaignElectionTransitionRegistry`; publication through
`publishPublicEvent`; knowledge stays per person.

## Residuals

- No state-level partisan geography; seats carry no regional lean.
- Senate class and term references need a refresh when senate.gov changes.
- Locality holders stay empty until RULES admits local membership.
- Seat successions after a term ends are not produced yet (`no-current-record`).
