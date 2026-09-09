# Qualification and Campaign Compliance

Status: bounded QUAL-COMPLIANCE1 / QUAL-DATES4 slice, 2026-09-09.

## Source boundary

The qualification source domain accepts two named transports and no inferred
third shape:

- the 12-column 31F compiler-ready TSV; and
- the recovered 14-column 31D TSV, including `derivation_chain` and `notes`.

Both compile in full as staged secondary research. A separate reviewed compiler
promotes 63 unique claims from MN, MO, NE, NV, and OH only where the cited
first-party provision was acquired, hashed, and contains the transcribed words.
The generated source ledger accounts for all 719 research rows as 63 compiled
and 656 refused. `KNOWN`, `UNKNOWN`,
`NO_REQUIREMENT_FOUND`, and `NOT_APPLICABLE` remain different values. An
`OFFICE_DOES_NOT_EXIST` row remains an existence fact, and a `HISTORICAL`
derivation cannot become a present qualification. Staged research does not
cross the production gate merely because a row calls its source primary.

The 92M JSON likewise compiles every jurisdiction/field row as staged research.
Its `official_source` property is a synthesis label rather than a locked
publisher URL and artifact, so the declared `source_tier` is transported but
does not promote the row.

Only fields separately checked against current first-party text reach the
simulation. The current bounded set is:

- Alaska House and Senate age, state-residence, district-residence, and term
  rules from Alaska Constitution article II, sections 2–3; and
- 63 office facts from retrieved provisions in Minnesota, Missouri, Nebraska,
  Nevada, and Ohio, joined to legislative candidacy only by exact jurisdiction
  and chamber keys; and
- Kentucky candidate campaign statement, reporting schedule, electronic
  filing, public-record, amendment-transport, itemization, and no-commingling
  rules from current KRS 121.180 and current Registry guidance; plus Minnesota
  and Nebraska committee prerequisites from their separately acquired statutes.

Every production row now separates four dates that answer different questions:

- the research transport's reported date is preserved exactly and is not legal
  proof;
- artifact retrieval and publisher vintage describe the acquired source;
- provision validity states an exact interval only where a first-party enactment
  establishes it, otherwise it is a current observation or `UNKNOWN`; and
- the simulation's `onDate` selects whether that evidence supports the queried
  life date.

Ohio Constitution article XV, section 4 therefore preserves the recovered 1851
transport value while supporting the current clause only from the official
page's November 3, 1953 effective date. Nevada's attorney-general age,
residence, and State Bar clauses use the May 29, 2021 approval/effective date of
chapter 199, not the research row's October 1 date and not the later 2025
amendment annotation. The same audit was applied to every accepted source: a
current page without clause-specific history becomes `CURRENT_OBSERVATION`, so
it cannot answer an earlier simulation date.

## Qualification consumer

`candidateQualificationRuleSet(candidacyPackId, officeKey, onDate)` and the
generated office query use exact pack, office, state, and chamber keys plus an
explicit date. They never infer an office family from a title. The assessment
takes dated birth and residence facts and returns field-specific refusals. A
missing district identity remains an unproved district-residence refusal; it is
not treated as permission or as proof that no requirement exists. Evidence
observed after `onDate` yields an explicit unknown field rather than leaking
later law backward into the character's life.

The accepted Alaska rules are attached only to
`us-ak-legislature-v1:house` and `us-ak-legislature-v1:senate`. Recovered rules
attach only where an accepted legislative pack exposes an explicit matching
state and chamber key. Missing fields retain the labelled game fallback or an
explicit unknown; a sourced requirement the world cannot prove becomes a
refusal, never eligibility.

## Campaign-compliance consumer

Kentucky campaigns carry the feature-local
`us-ky-candidate-campaign-compliance-v1` identity. The typed writer records a
private draft or a public filing and validates the date-supported `KEFMS`
transport. Its record status is `draft` or `filed`; neither means that the
Registry approved the document or that no violation exists. Corrections append
an amendment that names the earlier filed document and never overwrite history.

Kentucky evidence is a reviewed field-level transcription tied to exact hashes
of the acquired official statute PDF, 2026 chapter 175 enactment, and Registry FAQ. The statute-version
effective date, a field's own effective date when established, source vintage,
retrieval instant, and conservative support start are separate fields. Unchanged
clauses do not inherit the statute page's 2026 version date as their historical
commencement. The reporting points are period anchors, not filing due dates:
current text measures timely receipt within seven business days after the period
ends. Because the simulation has no Kentucky business-day/holiday calendar, it
preserves periodic drafts but refuses to invent an exact periodic filing
deadline.

Contribution intake is a recordability gate, not a contribution-limit engine.
It can distinguish a candidate contribution from personal money, require the
currently supported itemization fields, and refuse an unknown contributor. The
current 2026 contribution-limit amount remains `UNKNOWN` until its own current
first-party field compilation exists.

The state campaign adapter also carries two Minnesota obligations and one
Nebraska obligation from exact acquired text to canonical campaign records. It
never attaches a rule by office name. Their current publisher pages do not prove
clause-specific historical start dates, so the rows are `CURRENT_OBSERVATION`
and queries before retrieval return `unresolved`. On a supported date, Nebraska
refuses contribution intake until explicit statement-of-
organization and qualified-elector-treasurer facts are supplied; creating or
filing a campaign is not treated as agency approval. Minnesota distinguishes
the candidate's own contribution from other sources for its $750 aggregate
trigger while leaving all recorded money in the campaign committee treasury.

Campaign funds remain an organization-owned resource position. The adapter
never writes a personal resource position. `projectCampaignCompliance(...)`
derives committee access from candidate/staff relationships: committee viewers
receive private drafts plus public filings; everyone else receives only public
filed records.

## Ownership boundaries

- This slice does not implement municipal governing procedure.
- It adds no global navigation. The projection is a feature-local UI adapter.
- It does not alter, wrap, or advance the campaign clock. Compliance document
  writes are append-only history writes at the world's existing date.
- It does not add election-outcome prediction, corruption inference, or a
  national campaign-finance engine.
