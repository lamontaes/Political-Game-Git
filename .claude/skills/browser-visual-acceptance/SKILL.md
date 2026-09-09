---
name: browser-visual-acceptance
description: >
  Run exact-head browser and human visual acceptance for Political Game player or
  developer surfaces. Use for UI, interaction, responsive, scene, pose, or art
  review that needs a real browser; do not use for nonvisual unit-only changes or
  treat automated E2E success as visual acceptance.
---

# Browser and visual acceptance

Read `.agents/workflows/pg-visual-review.md` and `.agents/rules/visual-acceptance.md`.
Use the checked-in `dev:identified` and Playwright interfaces; do not fork or
rewrite the DEV-LAB2 harness.

## Bounded workflow

1. Run `$project-operations` preflight and verify the exact branch/SHA under test.
2. Choose a unique explicit port, seed, run ID, artifact directory, and cache
   directory. On a shared host, coordinate a finite heavy-test window; do not add
   a scheduler, kill by process name/port, or reuse another owner's outputs.
3. Start the identified server with
   `npm run dev:identified -- --port <port> --seed <seed>`. Verify
   `/__dev/identity` matches the absolute checkout, branch, HEAD, dirty source
   digest, and expected origin before opening the review URL. Restart after source
   changes; stop on an identity mismatch.
4. For browser automation, set the existing `PLAYWRIGHT_PORT`,
   `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_EXTERNAL_SERVER`, `PG_RUN_ID`,
   `PG_ARTIFACTS_DIR`, and `PG_CACHE_DIR` contracts explicitly as needed. Keep
   workers at the harness-supported shared-host bound.
5. Inspect representative viewports with fresh browser state. Actually activate
   visible semantic controls by pointer and keyboard. Review contact/occlusion,
   sharpness, overlay residue, safe areas, resizing, and hitbox alignment.
6. Record native/lossless-enough screenshots and exact browser/build/source
   identity. Report PASS/FAIL issue by issue and distinguish normal-player
   reachability, fixture reachability, automated proof, and human acceptance.

## Stop condition

Stop on server/source identity drift, a human-visible failure, missing pointer or
keyboard activation proof, an unexplained timeout, or evidence written outside
the declared run directory. Green automation never overrides a visible failure.
