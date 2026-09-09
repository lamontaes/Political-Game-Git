# Qualification and Campaign Compliance

Status: bounded QUAL-COMPLIANCE1 slice, 2026-09-08.

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

## Qualification consumer

`candidateQualificationRuleSet(candidacyPackId, officeKey)` uses exact pack and
office keys. It never infers an office family from a title. The assessment takes
dated birth and residence facts and returns field-specific refusals. A missing
district identity remains an unproved district-residence refusal; it is not
treated as permission or as proof that no requirement exists.

The accepted Alaska rules are attached only to
`us-ak-legislature-v1:house` and `us-ak-legislature-v1:senate`. Recovered rules
attach only where an accepted legislative pack exposes an explicit matching
state and chamber key. Missing fields retain the labelled game fallback or an
explicit unknown; a sourced requirement the world cannot prove becomes a
refusal, never eligibility.

## Campaign-compliance consumer

Kentucky campaigns carry the feature-local
`us-ky-candidate-campaign-compliance-v1` identity. The typed writer records a
private draft or a public filing and validates the exact schedule date and
`KEFMS` transport. Its record status is `draft` or `filed`; neither means that
the Registry approved the document or that no violation exists. Corrections
append an amendment that names the earlier filed document and never overwrite
history.

Contribution intake is a recordability gate, not a contribution-limit engine.
It can distinguish a candidate contribution from personal money, require the
currently supported itemization fields, and refuse an unknown contributor. The
current 2026 contribution-limit amount remains `UNKNOWN` until its own current
first-party field compilation exists.

The state campaign adapter also applies two exact Minnesota obligations and one
Nebraska obligation to canonical campaign records. It never attaches a rule by
office name. Nebraska refuses contribution intake until explicit statement-of-
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
