# Session 127: Cuff measurements need a reliable edge mask

Native garment measurements are underway. The first cloth-to-skin boundary
probe includes hems and seams, so its color distances cannot establish cuff
acceptance. Production cuff prep and original art remain untouched while the
measurement mask is refined. Continue from the recorded probe without treating
its output as before-and-after proof.

## Resume state

Current item: b24-p1-s4. Branch: codex/session127-b24-p1-s4.
Base/head before this marker: ae27b4da00da3d9391a9d4c34776f1ef28f436cc on main.
[Claim and exact cuff-region holder question](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6019973093)
posted on board #2424. No exact open b24-p1-s4: cloud task title was found.
Preserve pack.ts cuff region, skin.ts and cloth-edges.ts until a native cause is
measured; no duplicate writer. Production is unchanged. The independent new
[regression probe](../../../src/presentation/appearance-engine/cuff-boundary.test.ts#L1)
is built and records current-main baseline separately from any future fix.

Independent diagnostic /tmp/session127-cuff-measure.mts runs the real pack
compositor on native files and rejects pose fallback. It exercises feminine
casual/formal/blouse-skirt/dress-blazer and masculine casual/formal, average
build, front standing/seated, plus masculine hands-in-pockets. It chooses navy
for declared garment parts and probes cloth-to-exposed-skin proximity below the
body shoulder row. Output is diagnostic only, not a calibrated cuff mask.
The first version mistakenly classified cream cloth as skin; the corrected
version excludes every declared cloth mask from skin-neighbor classification.
Do not use the rejected initial probe for acceptance or a before/after claim.

Corrected broad boundary log: /tmp/session127-cuff-measure-masked.log.
Its 31 part rows include zero-sample regions; nonempty mean RGB distances to
navy base range 7.766 to 66.590, as recorded in the
[diagnostic board receipt](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020087437).
Restricting fully opaque cloth further creates
zero-sample standing cells: /tmp/session127-cuff-measure-opaque.log.
These are one-output diagnostic measurements. Neither proves a cuff fix or a
halo-free composite. Define a nonvacuous cuff/cloth-edge mask, separate genuine
shading and authored white cuffs from discoloration, and retain native alpha edges.
Record actual old/new measurements before selecting a cuff acceptance bound
or editing production.
The new probe covers fourteen front category cells and fourteen requested turned
cells. Thirteen front cells pass with 4,923 cloth-junction pixels and no RGB
change between lightest and darkest skin shades. One front pants cell fails
because its mask is empty; fourteen turned cells fail fallback rejection. Four
unchanged cloth-edge tests pass: total 17 passed / 15 failed. The mean RGB
distance bound is <64, computed as ceil(recorded required-part maximum
62.525364...)+1. Recorded-before and current-after means are identical because
production is unchanged. These are broad junction masks, not completed cuff
alpha/halo acceptance. The probe preserves original garment buffers.
[Executed probe receipt](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020169275).
Final log: /tmp/session127-cuff-final-test.log.

Complete native turned pack and supported staging remain missing as previously
reported in board comment 6018953167. No substitute or enlarged art.

Previous items:

- Hair #2730 is non-draft READY under CTO6019622068 input-gap scope, exact head
  52966cdb2bd12a6683bde4c35c0895b5011e6229. Scoped 57 tests pass, including
  explicit absent turned hair assertion. No turned pixel proof. GitHub unit
  112357271825 SUCCESS, scope 112357199197 SUCCESS, repository 112357198765 FAILURE
  and aggregate 112359668423 FAILURE. Fetched repository log has four inherited
  time-command.ts moment errors and facet-opportunistic.test.ts118 preferences
  error, already routed to clock/trait owners. No unrelated repairs.
  [Terminal receipt](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020007581).
- Collar draft #2732 at 187cceb4c2be955bc9a32453c4cb8fbf1955ca63 has 104 native
  front cases plus 31 unchanged appearance-engine tests passing; eight missing
  turned cells fail fallback rejection. Zero current fully opaque collar-band
  overpaint; explicitly reconstructed collar-last order: 16,498 contaminated
  pixels. Production unchanged, no turned proof. Marker is on its own branch.
  [Published collar receipt](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6019954798).
  Unit 112360664202 at that head fails only eight missing turned assertions,
  as independently delivered by Session 10 at 15:47:18 UTC. No blind rerun.
  Repository 112360576448 also fails shared clock/trait errors at 15:51:48 UTC,
  separately from pixel-input failures.
  [Terminal collar acknowledgment](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020108472).
- Rim draft #2725 at ef9d9ed6e290398fd5cf8def16856e539628fcbf has four native front
  cases with zero near-white rim pixels and four missing turned failures.
  assemble.ts unchanged. Marker is on its own branch.

Focused strict TypeScript, ESLint, Prettier, diff, no-dice, report and release
checks pass for the bounded probe. [CTO dispatch 6020150829](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020150829) requires #2733 to
land before repository gate recovery; preserve clock/trait owners and rerun
checks on any resulting new head. Do not transfer old CI.

No cuff READY, visual approval, installed runtime, merge or Steam action.
Next command from /workspace/game with subprocess execution enabled:

```sh
OCD_STORAGE_STATE_DIR=/workspace/session127-storage npm run storage -- run test -- npx vitest run src/presentation/appearance-engine/cuff-boundary.test.ts src/presentation/appearance-engine/cloth-edges.test.ts --disableConsoleIntercept
```

The next substantive step is a source-grounded cuff mask retaining alpha edges
and excluding unrelated hems. Publish the bounded probe as a draft; then check
the next queued id b24-p2 for existing ownership/cloud-task PR before any claim.
Continue independent queue work if private turned delivery remains absent,
checking existing PR titles and owners before each claim. Never silently count
fallbacks or diagnostic broad-boundary measurements as cuff acceptance.
