# Production finance & employment inputs

This directory holds normalized Census government finance and employment
documents that the production compiler may read. It is currently empty.

PR #56 populated its compiler from files that carried
`sourceSystem: "US_CENSUS_BUREAU"` and hand-typed `sourceHash` values — rotated
hex walks such as `9c0d1e2f3a4b...`, several of them not even 64 characters.
The figures were invented. Those documents now live under
`../__synthetic_fixtures__/`, relabelled as synthetic, and the compiler refuses
to read from that path.

Populating this directory requires the real artifacts:

- Census Annual Survey of Public Employment & Payroll (APEP) extracts
- Census Annual Survey of State and Local Government Finances extracts

Until those are obtained and hashed, an empty production corpus is the correct
state. An empty corpus says nothing; a fabricated one says something false.
