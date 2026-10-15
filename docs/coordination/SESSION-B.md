# Session B — overnight October 15

Only Session B writes this file.

## What the owner can play now

On `world/session-b-layoffs`, firms read their paid sales and operating losses before hiring or laying off. Workers lose the actual job, can claim unemployment insurance, and the press can print the employer's announcement.

## Orders

- Layoffs: draft #4329. Implementation and focused checks pass; acceptance remains incomplete. The drawn year has hires 1.197%, quits 0.921%, layoffs including closures 1.105% per month, below the historical national bands. Never force those rates onto individual outcomes.
- Deposits: not implemented. Read the counted-group account and fill-in seams before moving household cash; deposits must follow households when groups change.
- New homes: not started.
- Core cleanup: not started.
- Pool: not claimed; the assigned orders are not complete.

## Proof and checks

Source `5d18f477b5`, base `1977d40995d7bf88a69f24d2e5a100210eafec54`. Seed `1977d40995`, place drawn by `drawPlace(seed, "world-business")`: Anon Raices, Puerto Rico (`7203174`). The ordinary bench world runs January 20, 2025 through January 20, 2026 with all its modules. Build 4.113 seconds, year 24.632 seconds; baseline build plus year rounded to 28 seconds. No claim of a median or precise percentage from rounded timing.

Full worker `person_f8ba73a7d4dea8d8` lost job `work-relationship_59bb1bb9c1069956` on October 1; its claim paid 336,000 minor units. Counted worker `person_41730db0ac21dae5` lost job `work-relationship_5b59c2ee50741ed3` on March 1; its claim paid 344,960 minor units to the residents account. Trading, change, claim and printed-story IDs are in #4329.

Focused tests: 33 passed across jobs, affordability, business and business-audit; after the final recovery correction, the 15 jobs and affordability tests passed again. Changed-file typecheck has zero diagnostics (five in unchanged dependencies excluded); eslint, prettier, zero-dice and release PR check pass. No full suite ran.

## Remaining failures and dependencies

The JOLTS check fails for all three series. The proof excludes government and other jobs outside the staffing engine's business books rather than counting those jobs only in its denominator. The six printed stories establish press consumption; the press's existing `SG-PEOPLE-press-bring-it-up-row` path does not pass the detailed operating-cost facts through to reader text. The Words session owns that path. No claim that a rendered news sentence explains the costs.

Runtime access needs `network.enabled` on remote commands. Dependencies are installed in the existing checkout. Storage state is `/workspace/.session-b-storage`; no second repository copy was made.

Builder: Codex; no helpers. Exact deployment effort, usage and total session cost are unavailable. No PR was merged.
