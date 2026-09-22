---
id: the-name-corpus-measured-against-ssa
impact: none
---

Bounded research, authorised by lamontae on 2026-09-22: the Top 100 male and
Top 100 female given names with SSA's own counts, for every decade from the
1920s to the 2020s, are recorded at
`docs/research/evidence/ssa-given-names-by-decade.json`. 2,200 rows, eleven
decades, fetched from the SSA's published decade pages. Public-domain US
government data, transcribed rather than computed.

`docs/findings/2026-09-22-given-names-measured-against-ssa.md` reads it against
the shipped corpus. `GIVEN_NAME_GENERATION_POOLS_V1` holds 346 given names and
every generated person draws from all of them regardless of birth year; the
corpus covers 26% of the 1930s top 200 and 67% of the 1990s, rising
monotonically in between. It is a 1990s name list, and 240 of the top-100 names
of the 1920s through the 1950s are absent from it entirely, so no weighting
rule fixes it without widening the list as well.

Five names appear on both the male and the female top 100 of the same decade —
Willie in the 1920s, Terry in the 1950s, Jamie in the 1970s, Jordan in the
1990s and 2000s, Taylor in the 1990s — which is direct evidence that a shared
name is a feature of a generation rather than a standing property of the name.
It is not a crossing RATE: that needs SSA's per-name-per-year count files, and
this environment's network policy refuses that download at CONNECT while
allowing the published pages, so the rate stays open.

No shipped code changes. Evidence and a finding, handed to the names lane that
owns `given-name-fashion-by-birth-year` and `cross-gender-given-name-rate`.
