---
id: words-government-scenes-executive-changes
title: "The government scenes test expects the executive who served on day one to sign a bill acted on after the office changed hands"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by:
pr: #5923
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** src/director/government-scenes.test.ts fails on clean main with GOLDEN_PATH_SEED=eea75e6a47d2d69eee412cf149b3235a556521e3: expected the signer to be official:term:seat:US-VA:governor:2025-01-20 but the scene names person_d93f767820f709c2. The test reads the executive serving when the run starts, while the legislature's executive-action record names whoever sits at the desk on the day of the act, and the director casts the signer from that record. When the governor's office changes hands or its official is filled in during the run, the test fails although the scene is right. It turns every PR's unit run red when its draw lands there.

**Rules.** Ask why: the scene's signer is the person the act's own record names, so the test checks the binding against that record and against the office's holder, never against a name captured before the run. One rule, all 56 places: the check holds for any drawn place and seed.

**Done when.** src/director/government-scenes.test.ts checks that the signer or vetoer in the sponsor's scene is the executive the executive-action record names, and that this person is the executive office's holder at the start or at the end of the run; the test passes on seed eea75e6a47d2d69eee412cf149b3235a556521e3 and on one more seed the builder did not choose, both named in the PR body.

**Files.** src/director/government-scenes.test.ts

**Notes.** Found by the Words session on Oct 24 in the word pack's unit run (PR 4626), reproduced on clean main.

Sent back 2026-10-24 from PR #5923 (branch words/government-scenes-executive): government-scenes.test.ts:137-142 skips all signer checks when act executiveId is missing, and a floor vote alone returns success without any executive witness; assert a nonempty actor for signed/vetoed acts and require a positive scene-binding check across bounded draws with missing-actor/scene break-its; finish on that branch, merge main into it first.
