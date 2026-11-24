# Lead order: laws and effects, one lead (Oct 26, 2026)

Current as of 2026-10-26, 18:00 UTC (written by the laws-and-effects lead from main at f6ca0f680, the channel and the open PRs)

The owner, Oct 26: one engine lead for laws and effects together, on one checker and one matrix, with the traits rows living in the effects matrix (`.agents/rules/smart-and-look-first.md`, "The crew"). This order replaces the laws lead's order of Oct 24 (`lead-laws-2026-10-24.md`) for everything still open in it, and the effects and traits leads' queues. The laws, effects and traits sections of the channel stay as history; the lead writes only in `## Laws and effects`.

## Who

- **Lead:** one Opus session. It owns the law matrix, the effect matrix and the trait rows, and lands the open family PRs below. It never merges its own PR and never pushes to a branch while a merger's check is running on it.
- **Helpers:** at most two Sonnet helpers at once, each on one named PR branch or worktree, with its own check and output, read-only unless its brief names the branch it may push. The lead reviews every diff before it is pushed.
- **Skills:** `lead-session`, `wiring-audit` for the checkers and matrices, `pr-fixer` for send-backs, `played-world-proof` for the end-to-end claim.

## The three matrices and where they stand on main (f6ca0f680)

| Matrix                | File, built by                                                                                                                                     | Count on main                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Laws, nine links      | `docs/reports/law-wiring-matrix.json` and `law-wiring-table.md`, by `scripts/law-wiring/matrix.ts` over the runs of `scripts/law-wiring/check.ts`  | 46 of 89 laws wired on all nine links (39 partly, 4 stopgapped)    |
| Effects, eight points | `docs/reports/effect-web-matrix-2026-10-20.json`, by `scripts/outcome-web/effect-matrix.ts` and the twins in `src/core2/outcome-web-twins.test.ts` | 140 of 237 links reach someone; 0 neither reach nor name a stopgap |
| Traits, decisions run | `docs/reports/trait-wiring-2026-10-20.json`, by `scripts/traits/trait-wiring-audit.ts` and `trait-wiring-matrix.ts`                                | 57 of 82 decisions ran in the played year; 25 never ran            |

Counts are read from these files, never from memory or a PR body.

## The work, in order

No new family PR opens until the last one in the line above it is on main. After every merge the lead merges main into the next PR, runs its gate, pushes, and writes the new head in the channel for the mergers.

### 1. Laws: four family PRs, one at a time (time box 8 hours, 2 per PR)

| Order | PR    | Family                 | Done when (measured in `law-wiring-matrix.json` on main after the merge)                  | Builds against                                                                                     |
| ----- | ----- | ---------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1     | #5986 | Prices and sales tax   | Merged; the ten prices laws grade wired; laws wired at least 55 of 89                     | `laws-sales-tax-counted-reach-exceeds-town` (an over-count, filed; no link is graded from it)      |
| 2     | #6026 | Health and schools     | Merged; the eight laws its Done-when table names grade wired; at least 63 of 89           | `gov-medicaid-coverage-reader` for the Medicaid links; `laws-nine-links-health-schools` stays open |
| 3     | #5669 | Rights and environment | Merged; the eleven laws its table names grade wired; at least 74 of 89                    | `laws-checker-grade-each-link-across-runs` for clean air and groundwater                           |
| 4     | #6011 | Housing and credit     | Merged; the laws its table names grade wired; the count is the table's, at least 75 of 89 | `world-small-dollar-lenders` for the consumer-loan cap                                             |

Open send-backs at 18:00 UTC, each fixed inside its PR's box:

- **#5986** (Merger 2, 14:38): main conflicts in `src/core2/modules/place-prices.ts`. Keep both the mileage-fee read and main's container-redemption read, then regenerate the matrix and table.
- **#6026** (Merger 2, 15:50): `snap-maximum-to-food-insecurity` has no engine reading `household.food-insecurity`, yet the matrix grades SNAP's web cell wired. Either build the read or leave SNAP out of the bounded item (`laws-nine-links-health-schools-eight`) and keep its unread row.
- **#5669** (Merger 1, Oct 25): the family item asks for all 13 laws. Re-line the PR to the bounded item `laws-nine-links-rights-eight`, renamed to the count that grades wired, and keep `laws-nine-links-rights-env` open.
- **#6011** (Merger 3, 06:59): main conflicts in `outcome-research-gaps.json` and the matrix. The family item is not met (right to counsel partial, the loan cap's money on a stopgap), so it lands as a bounded item and `laws-nine-links-housing-credit` stays open.

Each target is the main count plus the laws the PR claims that are not wired on main today. A PR whose regraded rows fall short is fixed on its branch before it goes back to the mergers; the body's count is corrected, never the target. Per PR, the time box covers: merge main, resolve, run the family test and the local gate, push, CI green, head posted. A merger's send-back restarts that PR's box once.

### 2. Effects: five PRs, the same way (time box 5 hours, 1 per PR)

| Order | PR    | What it lands                                                    | Done when (measured in the effect matrix on main after the merge)              |
| ----- | ----- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1     | #6042 | Transit and road laws reach fares and prices (stacked on #6008)  | Merged with #6008 under it; its links grade `reaches: pass` by record id       |
| 2     | #6008 | Links the web never runs stop counting as reaching people        | Merged; no link that never runs is counted in `reachesTheWorld`                |
| 3     | #6151 | The twin check skips government measures and runs on main        | Merged; `outcome-web-twins.test.ts` runs to its end on main                    |
| 4     | #6154 | Each engine measure names its own reader or table                | Merged; no row credits the economy's monthly rows for another engine's measure |
| 5     | #5934 | A school budget raise reaches graduation as classes pass through | Merged; the schools link grades `reaches: pass` by record id                   |

Open send-backs: #6008 (Merger 0, Oct 25) writes "moves only in the monthly ledger" for links that never run (`scripts/outcome-web/write-unwired.ts:87`); name the real blocker. #6151 (Merger 3, 17:08) needs the drawn place's six runs and its moved-record table. #5934 (Merger 2, 07:56) has a test whose four full-year worlds pass 3,600 s; make it finish without raising the timeout, then merge main. #6042 and #6154 have no verdict yet.

The order is MERGE-FIRST's. #6042 sits on #6008, so #6008's commits land with it or before it; the lead merges whichever the mergers take first into the other. Target after the five: every link that reaches someone named by record, and `notReachingAndNoStopgap` still 0.

### 3. Traits: three stacks into the effects matrix (time box 6 hours, 2 per stack)

| Order | PR    | What it lands                                                 | Done when                                                                                |
| ----- | ----- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1     | #5657 | Civic decisions at researched sizes; the rest name why not    | Merged; its decisions show `ran` with calls in the trait matrix regenerated on main      |
| 2     | #5715 | Integrity: an official's own call decides the office's case   | Merged; bounded to the decisions that run; the producers stay on `traits-wire-integrity` |
| 3     | #6143 | Taking part at a meeting weighs temperament at a study's size | Merged; its decision shows its fitted weight and calls in the regenerated matrix         |

Open send-backs: #5657 (Merger 1, 08:54) skips every answer check when a lean is near zero (`src/core2/modules/voting.traits.test.ts:166`); assert each answer or require a non-neutral witness, then merge main. #5715 (Merger 3) conflicts with main in `src/core2/trait-pairs.ts` and `data/content/trait-decision-gaps.json`. #6143 (Merger 3, 16:59) conflicts in seven files and waits on #5657.

The stacked PRs on these three (#6017, #6039, #6095, #6128 on #5657; #6001 on #5715) are not this order's; they follow in MERGE-FIRST once their base is on main. Regrading into the effects matrix: once the three are on main, `effect-matrix.ts` reads `trait-wiring-2026-10-20.json` and carries one row per decision with its ran or never-ran grade, so there is one effects matrix with a traits block. That is one PR, opened only after #6143 is on main.

### 4. Regenerate both matrices on main and post the counts (time box 2 hours)

- Laws: `node --import tsx scripts/law-wiring/matrix.ts` over the run files on main; post "laws wired N of 89".
- Effects with traits: `node --import tsx scripts/outcome-web/effect-matrix.ts` after the twins run on main; post "links reaching someone N of 237" and "trait decisions run N of 82".
- The counts go in the channel's `## Laws and effects` block and the report PR (#6164), which merges last with #5675 and #5968.

## Model, helpers and checks

- The lead is Opus. Helper A (Sonnet) takes the PR at the head of the line: merge main in its own worktree, run the family test on its named seed and on one drawn place, report the conflicts and results; it pushes only after the lead reviews the diff. Helper B (Sonnet) takes a merger's send-back on the next PR in the line, the same way. Neither opens a PR.
- The local gate on every push: typecheck, ESLint and Prettier on changed files, `release:check --mode pr`, `npm run zero-dice`, `npm run pool -- --check`, the changed files' tests and the family test. In this cloud session every npm command runs with `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"`.
- Speed: a family PR that touches a module's daily path is measured with `npm run speed:year` on main and on the branch, same machine, one process at a time; more than 20% slower goes back.

## When the box runs out

Push what passes, set each item's state honestly with a one-line Note naming the branch, write the last block in the channel, and stop. Owner questions are never asked here: a design call about the player's own play goes under **OWNER DECISIONS NEEDED** with the reading line from `smart-and-look-first.md`; everything else is ruled by the standing rules and filed in `OWNER-DECISIONS.md` as an acting-lead ruling.
