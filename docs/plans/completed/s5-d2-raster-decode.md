# S5-D2 initial raster readiness

Base: 37c3cd056147a64fa2a7d76b1e52eccef7128742 (fetched main).
Brief: https://docs.google.com/document/d/1zzCVyeHwMN_NB1N-ht6HZ6E3L1H2Yqu7e2kEUX8ZNoM/edit
Worktree: /private/tmp/pg-s5-d2; branch: codex/s5-d2-raster-decode.
Preflight passed; source workspace remains read-only. Unique browser port: 4286.

1. Audit consumers and reproduce with held image responses before production edits.
2. Initialize explicit unpainted state; retain existing decoded commit and resize hysteresis.
3. Add transition and browser regression matrix; run full validation and art commands.
4. Record evidence, architecture audit and LEARN; open one draft PR, verify exact-head CI, leave unmerged.

Consumer audit before changing initialization:

| Consumer                   | Initial missing URL handling                                   | Compatibility                                            |
| -------------------------- | -------------------------------------------------------------- | -------------------------------------------------------- |
| TitleTableau               | Conditional image; plain title ground remains                  | Compatible; no eager dependency                          |
| SceneBackdrop              | Conditional image, surfaces and people; ordinary page fallback | Compatible; readiness now gates art decorations          |
| ProductionOfficeProofView  | Conditional production plate                                   | Compatible; selected-tier diagnostics describe selection |
| ScenePresentationProofView | Conditional plate with explicit proof fallback                 | Compatible                                               |
| SceneAuthoringProofView    | Conditional plate with geometry overlay available              | Compatible                                               |
| OfficeScene                | Does not call hook; uses existing office compositor            | Unaffected                                               |
| raster-tiers unit tests    | Three tests assume initialized tier is decoded                 | Explicitly commit initial decode in resize fixtures      |

No production consumer intentionally requires eager paint. No PlayerGame, CSS,
PR79, Begin, menu or art changes are authorized. D1 held; D3 deferred.

## Architecture integrity audit

- Primitive reuse: corrected within TierPaintState and its existing hook only.
  No parallel readiness state, preload-all workaround, fade or overlay.
- Fallback honesty: null distinguishes selected/requested resource from decoded
  paint. Failed/unavailable resources preserve earlier paint, or remain absent
  when no earlier paint exists. Image.complete alone is not readiness evidence.
- Compatibility: all five direct hook consumers already branch on paintedUrl;
  OfficeScene is independent. Existing selected-tier diagnostics remain selection
  diagnostics. No eager-first-paint consumer adaptation is needed.
- Context/history/determinism/headless boundary: no World, time, RNG, canonical
  history, jurisdiction, source substrate or simulation changes.
- Scope: no PlayerGame.tsx, player.css, PR79, Begin, menus or art changes.
  No accepted simulation behavior or stage authorization is changed.

## LEARN

Readiness regressions must begin with no decoded resource and independently
control response/load/decode; a resize-only fixture that assumes an already
painted raster cannot prove first-mount correctness. The durable transition
and controlled-browser tests encode this lesson rather than enlarging prompts.

## Result and exact before/after proof

Production repair: `TierPaintState.paintedWidth` starts at null. The hook
promotes only a successfully decoded image with positive natural width through
`commitDecodedTier`. Existing hysteresis, stale-request rejection, cancellation
and replacement retention remain the same. No consumer production file changed.

The final before replay served both production owner files byte-for-byte from
base main. The durable 1440×900 reduced-motion test failed as expected:
painted tier `1376`, image present, naturalWidth `0`, stage opacity `1` while
image responses were held. The repair was restored byte-for-byte afterward.
Earlier pre-repair runs also failed both viewport shapes and motion settings.

After repair, all four held-response combinations (1440×900 and 900×1100,
reduce/no-preference) report an empty painted-tier attribute, no image, and
stage opacity `1`. Successful decoding then produces a ready image. This is
honest initial unpainted state, not elimination of the network wait or a new
loading design.

The cold/warm resize sweep sampled 168/291 frames, including 153/281 claimed
painted frames: **zero undecoded claimed frames** in both. Each document kept
one stage identity and one image identity after initial readiness. Observed
painted tiers were 1376 and 2048. A separate held-response resize proved the
same decoded image A remains mounted and visible until B is ready.

Evidence: [before](../../agent/evidence/s5-d2/browser-before.json),
[after](../../agent/evidence/s5-d2/browser-after.json),
[cold screenshot](../../agent/evidence/s5-d2/cold-paint.png),
[warm screenshot](../../agent/evidence/s5-d2/warm-paint.png),
[held resize](../../agent/evidence/s5-d2/resize-held-A.png).
Screenshots were inspected; automated checks do not constitute owner acceptance.

## Validation personally run

- `npm run agent:preflight`: clean isolated branch at exact fetched base.
- Focused raster/title unit run: 46 passed. Final focused run additionally covers
  registry and composition; see the archived focused log.
- `npm run validate`: PASS, 159 files / 2,875 tests; format, lint, typecheck,
  source validation, byte-identical source replay, build, deterministic demo,
  and art validation all pass.
- `npm run inventory:art`: PASS, inventory up to date (329 items).
- `npm run qa:art`: PASS; contact sheet and report generated, no tracked art diff.
- Narrow browser matrix: all 11 new D2 tests passed. Existing title,
  scene-presentation and scene-authoring suites: 34/36 passed on the broad run;
  both failures passed unchanged on focused rerun (2/2). The original failures
  remain disclosed: one existing production-route timeout and the pre-existing
  unbounded `/tier/i` regex matching `Gutierrez` in a generated surname.
- Existing scene-authoring pointer capture and keyboard activation tests passed.
- `git diff --check`: PASS.
- Exact-head remote CI is separate evidence, reported on the draft PR; local
  checks are not inherited CI or owner visual acceptance.

Environment corrections: the sandbox initially denied server binding, so
server-dependent validation was rerun with permission. An interrupted run used
mixed dependency resolution during isolation; the completed runs use a local
copy of the pinned dependencies and the repository's supported Chrome channel.
No timeout inflation, assertion removal, browser-version pin edits or unrelated
production fixes were used. The added unit test uses its function name because
the existing prose inventory counts even test-description literals.

## Acceptance and scope

Ready for narrow S5-D2 review, subject to the draft PR's exact-head CI and owner
acceptance. Leave unmerged. D1 remains held behind separate shell ownership;
D3 remains deferred. Begin remains the existing hard cut. No monitoring,
scheduled follow-up or unrelated S5 work was created.
