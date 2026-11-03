# Lane 5 state

0 of 12 paths confirmed. Oldest open PR 0 days.

## Works

- Cloud trial, Nov 3: `npm install`, `npm run bench`, New game → Start a life → Random place (**Oxford, Idaho**) → creator → Begin → the opening scene on Monday, January 20, 2025, 8:30 PM, no page errors. GitHub works through the session's tools; git fetch and push work.
- Unit 1, built (not verified):
  - #7140 `pool-generated-index-merge-starvation`: the pool index is written on main only; a branch never changes it. The conflict was reproduced on the old code (`CONFLICT (content): Merge conflict in docs/pool/INDEX.md`); the new integration test lands both sides with nothing lost.
  - #7141 `release-new-game-check-one-job`: the one check before a merge (ruling 2), `npm run new-game-check -- <replay number>`, a workflow job named `new game`. It passed in Old Forge NY (ab5f58e9be125c95), Acres Green CO (5660878e1d1a5a27), Winfield IA (fb6c084e9a388aaf) and Johnstown CO (2cc2572dee6151a5). Making it the only required check is the owner's branch-protection setting.
  - #7144 `tooling-stopgaps-register-per-family`: 673 rows in 40 family files, one reader, the old file deleted, and a mover script for open PRs that edit the old file.

## Failed

- `gh auth status`: the token in GH_TOKEN is invalid. Only search uses `gh`; pool search runs on the local files. Not blocking.
- The towns page is stale: replay number ab5f58e9be125c95 opens **Old Forge, New York**, not Haleyville, Alabama. Each fixed town needs re-picking through New Game Advanced before it's used for a finish line.

## Next

- Unit 1, the rest: `pool-empty-field-trailing-whitespace`, `core-stopgap-never-hit-audit`.
- Unit 2: pool truth (close what a spot-check confirms, release stale claims, `docs/STATE.md`).

## Card: unit 2, pool truth

- Finish line: `docs/STATE.md` says the furthest step, the newest build and who owns what; no claim older than 48 hours without a push; roadmap flags only from evidence.
- Proof: a list of claims released (item, claimant, last push); items closed by spot-check, with the command that proved each.
- Hands off: no item is closed on a word alone; no branches deleted.
- Known cheats: closing an item whose test wasn't run; a STATE line with no source.
- Size: 6-8 h. Checked by: a fresh session reading STATE.md against main.
