# Stopgap lander (Nov 12, 2026)

Your one job: land the Nov 10 stand-in triage so main's registers say what is really still open.

## What was found on main (commit 1aab7d50)

- The registers hold 574 open rows: `src/core2/data/stopgaps/*.json` (504) and `src/director/data/stopgaps.json` (70). `node scripts/stopgaps-report.mjs` lists them.
- On Nov 10 every register was checked row by row against the owner's test: "where does the player see or feel this?" Rows the player never sees were dropped as too in depth (owner, Nov 10). That work sits in 20 open PRs titled "Stand-in triage" (#8286 to #8319, 14 of them drafts). None merged. Only 5 triage pages are on main (`docs/stopgaps/triage-2026-11-10/`).
- Their bodies add up to about 130 rows kept and about 260 dropped, plus T0 (#8288, 40 missing-engine rows) and T4 (#8296, 50 world rows).

## What done means

1. One PR from current main that carries all 20 triage results: every register row's status, the triage pages, and the pool items each PR added or deleted. Where main changed a row since Nov 10 (a builder resolved it), main wins.
2. "Borderline" rows stay dropped by default, as the PRs say. List them in the PR body under "Borderline, for the owner" so the CTO can put them on the owner's page.
3. `node scripts/stopgaps-report.mjs` before and after, with the open count in the PR body.
4. The PR passes the merger gate in `docs/pool/START-A-MERGER.md` step 8 (changed-file checks, typecheck, the guard suite). Post `ready #N <sha>` on #7365 with that record. Never merge it yourself.
5. After it merges, close the 20 triage PRs with a comment: "Contained in #N."

## Rules

- Read AGENTS.md first.
- Release declaration: `docs/release/changes/<id>.md`, `impact: none`.
- Run only the checks for files you changed plus the guard suite; never the whole suite or the golden path.
- Build nothing. This is bookkeeping, so the build lead on the other account starts from a true list.
- Post on #7365 as `Stopgap lander:` lines, in plain words. Start a Monitor on #7365 first, so you see replies and don't stop after one pass.
