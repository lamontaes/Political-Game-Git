# Starting law 2026: research by batch

Each file here is one policy question from
`src/simulation/policy-pack-us-policy-positions.ts`, researched for the 50
states, D.C., Puerto Rico, Guam, the U.S. Virgin Islands, American Samoa and
the Northern Mariana Islands: the answer in force on 1/1/2026, the cite, the
date it took effect, and a source URL.

Nothing here is read by the game. After Claude CTO approves a batch in the
03 PROJECT LANES doc, its rows move into
`data/research/laws/starting-law-2026.json`, and the loop test in
`src/simulation/governing/law-in-force.test.ts` reads each one for every place.

- A place under `unknown` stays out of the game file: unknown, never "no".
- A state "no" outranks every city ordinance in `lawInForce`, so "no" is
  recorded only where state law rules the question out (a preemption statute,
  or a question only the state can answer). A state that stays silent while
  its cities may act is left unknown.
- Sources are web search results that quote NCSL, Ballotpedia, the Brennan
  Center, state codes and similar pages. This session's network could not open
  those pages directly, so each row names its URL for checking.

## Status

- `batch-1/`: approved (Claude CTO, 9/28/2026) and in the game file, with
  `preempts` on every row and the Pennsylvania, West Virginia and New Hampshire
  rent rulings.
- `batch-2/`: graduated income tax, cash bail, public broadband, mileage fee
  and gas hookups, redone from primary pages. Waiting for approval.
- `batch-3/`: automatic voting restoration, abortion time limits, bottle
  deposits, consumer data privacy and local minimum wage authority. Waiting for
  approval.
- `batch-2-incomplete/`: the first, search-limited pass, kept for comparison.
- `research-brief.md` and `apply.py`: the instructions each researcher
  followed and the script that moves approved rows into the game file.

## Retired minimum-wage estimate parameters

The minimum-wage reader now consumes the adopted numeric law terms and their
source-dated phases in `data/research/laws/starting-law-2026.json`. A yes/no
answer does not supply a wage amount. Missing regional or industry applicability
remains unresolved; the federal standard does not settle those schedules.

The following former simulation parameter files were retired from this branch:

- `data/research/labor/state-minimum-wage-raise-term.json`: historical median
  increases do not establish the amount or effective dates of a new law.
- `data/research/labor/local-minimum-wage-premium.json`: the average premium in
  a California locality sample does not establish another locality's ordinance.

The research remains available in Git history at
[the preserved A39 starting point](https://github.com/lamontaes/Political-Game-Git/tree/dabe31d2d32cf30f42cc208979d7618cc3d5a47b/data/research/labor).
The historical calculation is also documented in
[the retired state-raise evidence note](../evidence/state-minimum-wage-raise-term.md).
The sourced dated wage matrix is retained as evidence; it is not a second
runtime wage table. Opening-pay helper retirement remains subject to the
separate A38 caller-parity hold.
