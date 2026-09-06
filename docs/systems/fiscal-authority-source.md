# State and local fiscal authority (source domain)

`src/source/domains/state-local-fiscal-authority/` compiles what the law lets a
government _do_ about money: which tax instruments a level of government may
levy at all, what a balanced-budget mandate binds and at which stage, how
general obligation debt is authorized, what a budget stabilization fund's
deposit and withdrawal rules are, and which of the three tax and expenditure
limitation mechanics a state has clamped onto the local property tax.

It is a source domain, so everything in
[Source substrate](source-substrate.md) applies: two provenance records never
blended, one value algebra with five states that carry no value, opaque
capability handles, no wall clock, mandatory coverage. This document records
only what is particular to fiscal authority.

The research behind it is `92N_NATIONAL_STATE_LOCAL_FISCAL_AUTHORITY_COMPLETION`
(2026-09-05), which profiles all 50 states with first-party legal citations.

## It compiles no production records, and that is the decision

The domain declares a `productionGate`. The gate is a _sourcing_ gate, not an
acquisition-environment one, and the distinction is the same one
`government-units` draws in the other direction.

`government-finances`, `government-units` and `public-employment` are gated
because a proxy denies census.gov. A better network clears them; the compilers
are already correct.

This domain is gated because 92N is a research synthesis — a secondary source,
however well cited. `Evidence` in this substrate means "these are the bytes this
compiler read". A production record holding `KNOWN(2.0)` for a California
assessment growth cap, with evidence pointing at Cal. Const. Art. XIII A, would
assert that this repository read that article. It read a document reporting it.
No network fixes that.

Clearing the gate needs one of two things, and both belong to current
authority rather than to a compiler:

- the cited constitutions and statutes acquired as first-party artifacts
  through `source:acquire`; or
- an explicit architecture decision admitting a declared secondary-source
  evidence tier, with its own evidence kind so a reader can tell the two apart.

Everything else is real and exercised. The types, schema, parser, normalizer,
derivations and validator all work, and the fixture compiles end to end through
the same capability boundary every other domain uses. When the gate clears,
production fiscal authority is a data change rather than a design.

## Three separations, each one a way a fiscal model starts lying

**Authority is not observation.** A state that collects no local sales tax and a
state that forbids one are not the same state. 92N states this boundary in its
own header: observed zero revenue is not legal prohibition, and legal authority
does not guarantee collection. `government-finances` carries observed dollars;
this domain carries legal power. The validator makes a statistical product cited
as a legal authority an error, and it treats a Census government-finance line
code appearing as a legal locator the same way — that is the mapping running
backwards.

**Absence is not prohibition.** Local governments have no inherent taxing power,
so "no local income tax" is the expected reading of almost any silence, which is
exactly what makes it dangerous. `TaxAuthorizationStatus` keeps three legal
facts apart: `CONSTITUTIONALLY_PROHIBITED`, `STATUTORILY_PREEMPTED`, and
`NO_ENABLING_AUTHORITY` — the Dillon's Rule case, where an enabling chapter was
read and grants nothing. A prohibition that names no provision is an error, and
so is a `NO_ENABLING_AUTHORITY` that names no scope searched. An instrument with
no record at all is none of the three: `instrumentPermission` answers
`UNESTABLISHED`, never `BARRED`.

There is deliberately no authorization status meaning "levies it". Whether a tax
is imposed, and at what rate, is an observation.

**A summary is not a field.** 92N's schema carries
`stageClassification: 1 | 2 | 3 | 4` beside the four balanced-budget booleans it
summarizes. Stored, that number can contradict the booleans underneath it and a
reader cannot tell which is the fact. So it is not stored.
`classifyBalancedBudget` derives it and returns `INCOMPLETE`, naming every gap,
unless all four stage facts are `KNOWN`. `INCOMPLETE` carries no
`highestStage`, because the highest stage of a partial reading is not the
highest stage. A researched `KNOWN(false)` is a fact, not a gap.

Identity is not authority either. Whether a county government exists in a state,
or a school district, is a `government-units` fact. A fiscal field asked of a
level that does not exist is `NOT_APPLICABLE` with a reason, never a silent
absence.

## The matrix, and what it cannot express

One tab-separated row per fact, carrying its own status, value, authority,
locator, effective date, derivation flag and review flag — the qualifications
matrix shape, for the same reason: 92N states most of its facts inside prose,
and extracting a citation from a sentence is inference rather than
transcription.

Each field declares a value kind and a level scope. A percentage in a millage
column is a defect, and so is a state-level rule filed under a municipality —
92N's local matrix reports millage caps and levy growth caps in one column, and
a compiler that accepted either into either would let a ten-mill cap arrive as
ten percent.

Three value states are unreachable from this shape, and each refusal names
itself rather than downgrading quietly:

- `HISTORICAL` needs a closed interval and a row carries one date. A repealed
  millage cap with an invented repeal date is worse than no record.
- `SUPPRESSED` describes a publisher withholding a value it holds. A
  constitution does not suppress; an unreadable provision is `UNKNOWN`.
- `CONFLICTING` needs claims from two distinct artifacts, because one artifact
  read two ways is a parser defect. One matrix is one artifact, so a conflicting
  row becomes `UNKNOWN` with a reason saying so, and the validator reports it.
  Synthesising a second claim would manufacture the disagreement it claims to
  record.

A rule with no effective date cannot be `KNOWN`: a fiscal rule that cannot be
placed in time cannot be applied to a fiscal year.

## The anti-universal check

92N opens on the observation that a single tax model applied to every state is
legally invalid — twelve states have no local option sales tax mechanism,
thirty-six preempt local income taxes, five have no state sales tax, nine no
broad personal income tax. Local option sales tax authority is among the most
divergent fields in American fiscal law, so a corpus spanning five or more
states that reports the same answer everywhere has reproduced the slider this
research exists to refute. That is an error, not a warning.

There is no fiscal freedom index, capacity rating or solvency score, and no
field to put one in. The core fabricated-score guard is the second line, for a
verdict smuggled in as the _name_ of a fund or a forecasting body.

## Nothing reaches the game

No adapter consumes this domain. The import boundary that keeps
`src/simulation/` and every presentation layer out of `src/source/**` applies
here as everywhere, and no fiscal balance, scoring or budgeting system is built
on it. A fact reaches the world through a named one-way adapter or not at all,
and none exists for fiscal authority.
