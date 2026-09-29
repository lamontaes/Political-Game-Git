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
