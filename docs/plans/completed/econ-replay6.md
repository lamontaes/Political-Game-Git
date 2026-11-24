# ECON-REPLAY6 delivery plan

Date: 2026-09-09  
Owner: existing ECON-CONTEXT2 owner  
Carrier: PR #148, branch `codex/econ-context2`

## Authority and boundaries

- Execute the ACCEPT-PEOPLE6 FOLLOW-THROUGH `ECON-REPLAY6` addendum.
- Preserve the independently accepted E-1 repair at `926b036`, including dated
  observation gates and nullable comparison endpoint releases.
- Preserve the existing deterministic 292-shard browser replay.
- Reuse the existing compact Lexington producer; do not add a second exporter,
  panel, root writer, economic engine, source acquisition, or UI registration.

## Work

1. Establish whether `src/presentation/generated/economic-context-lexington.json`
   is covered by a deterministic regeneration-and-comparison gate.
2. If absent, make the existing producer callable with an explicit output path
   and add its byte comparison to `npm run source:replay`.
3. Add positive replay proof and a corrupted-artifact negative control proving
   stale values or endpoint releases fail the real gate.
4. Run focused checks, the actual replay, the unchanged browser-shard replay,
   typecheck, lint, formatting and build.
5. Publish the bounded checkpoint on draft PR #148 and hand its exact SHA to LAND
   for current-main reconciliation.

## Completion evidence

- The tracked compact artifact is regenerated through the accepted producer and
  compared byte-for-byte by `source:replay`.
- The corruption control fails with the tracked artifact path named.
- E-1 release fields/nulls and dated observations remain unchanged.
- The 58,106-record, 292-shard replay remains byte-identical.
- PR #148 remains draft, open and unmerged; LAND receives the checkpoint.

## Entry finding

The gate was absent. `scripts/source/replay.ts` regenerated only each registered
domain's `corpus.json` and `corpus-manifest.json` plus
`data/source/MANIFEST.json`. The existing browser replay test covered only the
manifest and 292 shards under `public/data/economic-context/v1`. Neither path
regenerated or compared the compact Lexington artifact.

## Result

- The existing producer is now callable with a scratch target and is registered
  in `source:replay`; no second exporter was added.
- The tracked compact artifact regenerates byte-for-byte. A corrupted
  `laterRelease` fails with the exact changed line, while the standalone producer
  leaves the accepted artifact unchanged.
- Focused source/replay tests pass 11/11 across the compact artifact, full
  292-shard browser export and accepted economic semantics. Typecheck, lint,
  formatting, source replay and production build pass.
- Code inspection at UI commit `1119e890c471fbf83b4cd592aabe6b28c5f075b2`
  confirms `PersonalWorkspace` mounts `EconomicContextPanel` once for the exact
  Lexington binding with `simulationDate={world.currentDate}` and `PlayerGame`
  routes that workspace. **That mount lives on the unmerged
  `codex/ui-core-release-transfer` branch (PR #144) only.** `1119e890` is an
  ancestor of neither this branch nor `main`, so the statement above is a fact
  about that branch, not about reachability here. On this branch and on `main`,
  `EconomicContextPanel` has one importer — its own test — and
  `playerEconomicContextLines` has zero non-test callers. The read models and
  the replay gate land here; a normal player reaches them only once #144 lands.
  No UI file changed here.
