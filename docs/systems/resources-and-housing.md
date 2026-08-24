# Resources and Housing

Stage 5 Run C makes personal resources and housing materially consequential without turning the simulation into accounting or property management.

## Exact personal and household flows

Canonical money is a safe integer count of minor units plus a validated three-letter currency identity. A stable resource flow uses a closed typed endpoint union—person, household, or organization—while basis, restriction, cadence, and outcome-reason content use validated open semantic namespaces. Organization endpoints support employer pay and personal housing/care payments; they do not create organization accounts or budgets.

Each flow has append-oriented effective terms. Initial terms may be expected for a genuinely future arrangement or active for an actual arrangement; later active/ended terms supersede history without overwriting it. Cadence is a contract description, not an automatic posting engine. A separate actual outcome records the attempted amount, transferred amount, period, date, completed/partial/missed/blocked status, and structured reason where required.

Work compensation is one flow basis linked to a stable paid or mixed organizational `WorkRelationship`. It never replaces work status or role history and cannot attach monetary terms to unpaid or in-kind work. Explicitly resolving a pay period selects the terms effective at that period's start, not at a later payment date, and creates an ordinary transfer outcome. An outcome may occur on or after period end. A terms change after the period start through its end is rejected as ambiguous until an explicit prorating model exists; no silent allocation is made. Multiple jobs retain multiple work and flow identities; raises append new terms.

## Position, obligations, debt, and affordability

A tracked person or household may have one opening liquid position per currency. Current or historical liquid position is derived from that opening plus committed outcomes visible through the date-and-exclusive-sequence cutoff. Each flow admits only one committed outcome for an inclusive settlement interval, so duplicate or overlapping periods cannot double-count that balance; partial, missed, and blocked results remain the one canonical outcome for their period. When both endpoints are tracked, one outcome debits and credits the same exact amount. There is no arbitrary balance-mutation API, automatic cadence posting, or floating-point dollar arithmetic; a tracked source cannot be overdrawn.

One stable major obligation may link to a flow and has active/satisfied/ended state. Its open basis may represent housing, care/support, debt, or another meaningful recurring obligation; a semantically different obligation uses a different flow rather than double-counting one arrangement. An optional exact principal supports bounded debt history; linked payments after the obligation exists reduce outstanding principal and cannot exceed it. This is not an interest, amortization, collections, credit-report, bankruptcy, tax, insurance, investment, or bank-account model.

`assessAffordability` returns structured available, strained, or blocked status with exact liquid-position and obligation evidence plus reason keys for a proposed meaningful expense. The caller supplies one explicit exact cadence key as its comparison bucket. Active same-currency obligations are returned as separate cadence-preserved buckets, and only the matching bucket contributes to strain; weekly and monthly (or any other distinct open cadence keys) are never added into one money amount. It is derived, not stored truth, and is not a financial-health, wealth, utility, or credit score.

Care responsibility remains the canonical structural fact that care exists. A care-linked obligation or cross-household flow can make that responsibility financially consequential, but creating, paying, changing, or ending money movement never creates or changes care, kinship, partnership, child authority, or household membership.

## Dwelling, occupancy, and tenure

`Dwelling` is a sparse stable physical-place identity with establishment date, jurisdiction ID, location label, open classification, provenance, and append sequence. It is not a household, household-location record, resident roster, property listing, or market valuation.

Occupancy links a person or household to a dwelling with active/ended state, primary/secondary/shared role, and an open context kind. Tenure independently links a person, household, or organization to the dwelling with active/ended state and an open lease, ownership, assignment, hosting, or other basis. Therefore:

- a household may move without changing identity;
- a resident or household member need not be an owner or tenant;
- an owner or tenure holder need not occupy;
- occupancy does not transfer tenure, and membership changes do not transfer either;
- assigned institutional or military housing uses the same records; and
- simultaneous secondary/shared occupancy remains possible while one occupant cannot hold overlapping primary occupancy records.

Housing obligations may link a tenure and flow, but the records remain distinct. Stage 5 adds no real-estate market, price/appraisal engine, mortgage underwriting, zoning, title registry, landlord-tenant law, or property-maintenance simulation.

## Subjective evidence and history production

Resource and housing roots/states/outcomes are finite typed life-source families. Actor relevance, effective date, and exclusive append sequence are validated before Stage 4 knowledge, appraisal, perception, temporary-state, or decision use. A later-appended backdated payment or occupancy cannot leak into an earlier subjective state. An explicit missed/blocked/partial outcome can support a bounded `life:resource-pressure` temporary state; no universal stress or wellbeing value exists.

Played, quick-generated, and authored `CharacterHistoryPlan` transitions all delegate to these canonical writers. Progressive person materialization remains nondiegetic and never fabricates a balance, flow, obligation, debt, dwelling, occupancy, or tenure merely because an NPC was inspected.

Every Run C family uses deterministic stable identity, provenance, one contiguous global append sequence, chronology and dangling-reference validation, date-plus-sequence queries, and exact JSON/Node-only SQLite persistence. The current Stage 6 Run B boundary is world schema 11 and snapshot format 10; the Stage 5 identities and semantics are unchanged.

## Deferred consumers

Campaign contributions/treasuries, organization budgets/accounting, government taxation/appropriations/program finance, generalized shocks/incidents, mutable support/debt/housing/tax law, territory-specific legal data, foreign governments, detailed banking/credit, and polished UI remain later-stage work. Run B aggregate income/cost/output and revenue/outlays/debt metrics are world conditions, never person/household balance mutations or a government account. Later systems may reuse both vocabularies without replacing personal life identities or turning this module into one universal finance object.
