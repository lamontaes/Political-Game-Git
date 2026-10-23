# People: old layered models removed

Oct 13, 2026, PEOPLE session. The game draws only approved whole figures.

## Deleted (5,231 files, 238.5 MB)

- `art/people-engine/` (5,194 files): the layered people pack.
- `src/presentation/appearance-engine/` (24 files) and `dress-code.ts`, `backdrop-people.ts`, `appearance-lifecycle.ts`, `day-clothing.ts`, `work-uniform.ts` with their tests.
- `data/content/pose-by-activity.json`, `scripts/appearance/` (the pack builder and proofs), `zz-preview/` (an old preview that no longer built).
- From the bench: the people-engine fallback in `stagePeople`, `/api/figure`, `figurePng` and the opening's figure prerender.

## Method

`node scripts/dead-code/reachable.mjs` before and after the bench change: 34 files stopped being reachable from `/play`, all of them the people engine and the clothing rules feeding it. The pack art and its tooling went with them. `npm run typecheck` is clean afterwards.

## Kept

`complete-outfit.ts`, `engine-people29-data.ts`, `private-candidate-manifests.ts`, `runtime-art.ts`, `bundled-art.ts`: unreachable from `/play` but still imported by old scene and prose tooling (`scripts/prose-corpus`, `src/presentation/scene-registry.ts`). They go with the old-core removal.

## Proof

`scripts/people/scene-shots.ts`, 4 fresh games (Sleepy Hollow NY, Golden Valley NV, La Farge WI, Fort Payne AL; seeds 91a7e6c48d2a, fa825fc67f00, eb4814ddce0a, 898c50c1455b), 15 scenes each: before 78 whole and 293 old figures; after 145 whole and 0 others. Pictures in `docs/reports/people-shots/pr1-*`.
