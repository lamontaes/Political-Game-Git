# Weekend Playtest 0.1 — Integrated Slice E

## Authorization and boundary

This completed plan records the first bounded playable candidacy → campaign →
election → continuation vertical. It is a thin weekend-playtest path over the
accepted Stage 6.5 Runs A–D-Lite and thin election substrate. It does not claim
the complete Stage 7 institution, Stage 8 electorate, or Stage 9 campaign
systems.

The implementation started from `origin/main`
`d5c488a89c33ab425a276eec2112f78083ba6d7e`. The accepted visual convergence
head `ae60160a508098d498d98e4081f0e7ebe5f1e467` and election substrate head
`2452778d17cbb58b3f8d781befb2e3c24f24f941` were verified ancestors before
editing.

## Implemented scope

- Normal shell navigation opens a scene-native Campaign workspace.
- Filing creates or attaches to one accepted election contest, records public
  candidacy, creates a campaign organization, a candidate relationship, one
  volunteer staff relationship, one person endorsement event/relationship
  interaction, a separate campaign treasury, and scheduled fundraising,
  outreach, and election-night activities.
- `CampaignRecord`, append-oriented `CampaignStateRecord`, two bounded
  `CampaignActionRecord` kinds, and consequence-linking
  `CampaignActionResultRecord` provide the minimum durable cross-system seam.
- Resource positions may be owned by organizations. Fundraising uses an
  aggregate fixture supporter organization and the accepted resource
  flow/terms/transfer outcome model; campaign cash never becomes personal cash.
- Fundraising and outreach consume canonical zoned time through D-Lite,
  preserve commitment guards, append ordinary completion/action history, and
  progress staff work through existing rules.
- Candidate support uses an exact scoped metric state hidden from normal play.
  Each action produces a separate reproducible observation with nonzero error,
  stated margin/confidence, a private field-memo event, and candidate-owned
  partial knowledge. UI projection reads only observation and knowledge.
- Election-day campaign evaluation uses latest support plus bounded keyed
  uncertainty and then calls the accepted resolver. The existing election
  result/event remains the single outcome truth.
- Win and loss close candidate/staff campaign work and append a terminal
  campaign state. Neither destroys the World. Win defers office assumption;
  loss returns to ordinary office, Calendar, Work/Pending, document,
  conversation, and navigation play.

## Reused systems

The slice reuses stable Person/Jurisdiction identities, Organization and
WorkRelationship histories, relationship interactions, exact resource
accounting, ScheduledActivity and canonical moment progression, staff work,
WorldMetricState/Observation separation, EventKnowledge, FutureDue handlers,
and the accepted election contest/result/cancellation integrity. `PlayerOffice`
remains the sole mutable World owner.

## Determinism model

All campaign uncertainty uses `SeededRng` keyed by stable campaign, action,
candidate, state, or contest identity. Fundraising amounts, action effects,
observation error, initial support, and election-night uncertainty are isolated
forks. Canonical event text avoids locale formatting. Identical same-version
seed and action history produces byte-for-byte identical `serializeWorld`
output. A fixed same-seed proof shows a no-action loss and full-action win;
campaign actions influence outcomes without guaranteeing them.

## Persistence and integrity proof

Campaign families join the global contiguous append sequence and stable-ID
integrity set. Validation checks campaign/contest/candidate/jurisdiction,
organization/treasury ownership, candidate and staff work, activity/action,
support scopes, state supersession, result uniqueness, observation/knowledge,
resource consequence, and chronology links. JSON round trip and in-memory
SQLite save/load reproduce the complete terminal World exactly. Existing
schema 15 and snapshot 14 remain valid because new history arrays are optional
on worlds with no campaign and require no external-release migration promise.

## Portability proof

The generic domain loop runs in the fictional Synthetic Tidal Basin with
Pacific/Honolulu time, a Harbor Steward office, three different candidate
identities, different dates, a synthetic currency, and different activity and
organization copy. Its serialized World contains no Lexington, Kentucky, or
America/New_York leakage. This is an engine fixture, not a second polished
career or assertion of real civic law.

## Browser proof

Playwright covers keyboard discovery, filing, active campaign, treasury change,
outreach, visible canonical time change, imperfect field memo, deterministic
win, deterministic loss, persisted result reopening, and post-loss Calendar
and Work/Pending access. Native evidence is stored under
`docs/agent/evidence/slice-e-*.png`.

## LEARN pass

Concurrent worktrees exposed a pre-existing validation flaw in the identified
dev-server lifecycle tests: fixed localhost ports allowed another workspace to
invalidate an otherwise isolated run. Those tests now allocate ephemeral ports,
including a deliberately held ephemeral port for the strict-port failure case.
Production launcher behavior is unchanged.

## Explicit non-goals and limitations

- No effective election-law or institution engine, eligibility law, ballot
  access, primaries, districting, or sourced Lexington election-law package.
- No voters, precincts, turnout model, demographic electorate, campaign AI,
  party system, debates, media/news ecology, advertising, opposition research,
  or nationwide office database.
- No donor identities, contribution limits, compliance, campaign-finance law,
  banking, recurring fundraising, expenditure choices, or staff economy.
- No full polling industry, sampling frames, nonresponse model, pollster
  competition, or public poll release. One field memo is a bounded observation.
- No autonomous endorsement market; one authored person endorsement proves the
  ordinary history/relationship seam.
- No office assumption or governing term. A win is prepared for later work; a
  loss remains ordinary political-life gameplay.
- Campaign cancellation does not yet append a campaign-terminal state; the
  accepted election cancellation remains canonical and is not weakened.
