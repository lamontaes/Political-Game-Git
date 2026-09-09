# OPENING-FINISH4 checkpoint evidence

Parent checkpoint: `543ddec318d56a21ef31db48917a4ef9aa7bb80c` on
`codex/opening-life1`, draft PR #150. This directory records continuation changes
and their actual checks. It is not original-scope completion or human acceptance.

## Normal-player proof

`node scripts/proof-opening-life.mjs /private/tmp/NEW_DIRECTORY` makes a disposable
copy of the real app with the documented proposed root patch applied. The source
root and UI owner's workspace are not changed. In that copy:

```sh
npx vite build
OPENING_LIFE_PROOF=1 PLAYWRIGHT_PORT=5377 npx playwright test tests/e2e/opening-life-proposed.spec.ts --workers=1
```

The retained run uses `/private/tmp/pg-opening-finish4-proof4`. Its production
bundle is `dist/client`. Two journeys pass: ages 6 and 24 through the normal
creator, actual household, Back, keyboard Skip, scene, selected-person exchange,
Save, reload and Continue. Screenshots are retained here. They show the actual
feature, not a fixture route. Unit tests separately establish no duplicate
generation, A/B/A identity, appropriate consent, history and prerequisite gates.

Visual review corrected low-contrast raw text by consuming the existing
`life-moment` presentation class and distinguished same-name relatives using
actual relationship labels. Its existing scrolling boundary is retained. The
browser copy briefly included a redundant equal-specificity scroll rule; source
omits it because the existing player stylesheet already supplies the boundary.
Root scene/footer placement and transition chrome still need UI owner acceptance.

## Gates and limits

- 102 focused tests passed across seven files, one worker. Earlier continuation
  proof also passed all 87 opening/92C tests across seven files.
- Formatting, lint, typecheck, repository production build, proposed-root build,
  source validation/replay, and all three required art commands passed.
- The full exploratory test run did **not** pass. It surfaced assertion failures
  and many existing timeout limits, then stalled with one worker; only identified
  OPENING processes were stopped. A concurrent FISCAL full run was observed and
  reported to LAND; FISCAL later confirmed exit. Do not attribute every failure
  to contention. The actual incomplete output is retained.
- Corrected metadata requirement keys and the guardian/parent assertion pass in
  the focused run. Remaining broad assertion failures include single-moment
  versus multi-stage expectations, global option-label uniqueness, older empty
  personality-bank expectations, introduction expectations, adaptive-life
  behavior and exact-main conversation comparison. These require reconciliation;
  frozen donors are not blamed or rewritten as part of this checkpoint.
- Corpus regenerated from this source: 2141 templates, zero hard errors,
  267 warnings, 3452 unclassified candidates. No 100% prose coverage claim.

## Architecture audit and LEARN

Compatible: one canonical world/history/clock, saved stable identities, immutable
projections, existing household/mind/episode and participation stores, exact
production catalog firewall, explicit timed commands and transition-handler seam.
Daily recurrence is optional on the existing episode family and changes instance
identity only for declared everyday free-time content. Ended participation is
preserved; a later join creates a new record, while inactive participation resumes.

Corrected: actual activity completion, saved proposal-answer follow-through,
missing-person discovery guard, and visible outcome/relationship presentation.
Deferred: full source breadth, root transition consumption, remaining office
coverage and the preserved conversation-source consolidation. Those are not
represented as completed by successful local component tests.

LEARN encoded in tests/tooling: compare browser innerText with innerText; inspect
screenshots after passing browser assertions; include imported documentation assets
in disposable app copies; distinguish literal corpus measurements from estimates;
keep missing authored premises visible as unfinished implementation.

Shared heavy slot explicitly released to DEV after this finite sequence. No
server, monitor, deployment, automatic merge or human acceptance claimed.
