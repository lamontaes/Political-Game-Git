# Session 48 — b22-p5 reader-scoped news

Claim/action receipt: board #2424 comment 6016790368. This is a continuation of the existing b22-p5 ownership and draft PR #2515, not a new writer. Fable map #6015577087 assigns Session 48 to the economy-engine bank queue; current POOL assigns b22-p1 through p6 to S48.

## Work and boundary

- `projectNewsFrontPage` and article projection now receive the controlled reader and limit saved publications to federal/national, home-state and exact home-town coverage; home-state/local rows follow the national lead.
- News habit is derived from age, recorded civic interests, personality tendencies and work availability; `followsNewsClosely` delegates to it.
- The per-outlet follow source remains an explicit conservative false stub because World has no saved outlet-follow relationship. This is not an assertion of production outlet readership.
- Updated NewsDesk, living-scene headline and transit-report article callers to pass their reader identity.
- Only the p5-owned files and this progress note/release declaration are in this part. The separate p6 change stays in PR #2601.

## Evidence and next action

- Synthetic national/federal → home-state → home-town ranking regression: 1/1 passed with `npx vitest run --reporter=verbose --config .vitest.p5-temp.config.mts src/presentation/news-front-page.test.ts -t 'sorts synthetic coverage'`.
- Full p5 test file and actual-publication-only run previously stalled without results; they were interrupted. No full suite pass is claimed.
- Typecheck on shared local branch reported no p5-owned diagnostics; its two press-premise fixture errors came from the stale local blob, not current main. The exact p5 head still needs hosted typecheck.
- No fresh random-place new-game news proof is claimed.
- Next: confirm exact #2515 head and run its hosted checks. Do not repeat the one-month performance profile; p5 does not touch the measured SP-A runtime blob.
