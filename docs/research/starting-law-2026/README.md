# Starting law 2026: research awaiting approval

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
