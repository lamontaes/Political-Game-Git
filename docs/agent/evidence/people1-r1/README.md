# PEOPLE1-R1 transfer evidence

This is engineering and visual defect evidence, not human acceptance or candidate promotion.
The transfer plan and source recovery hashes are in `docs/plans/active/people1-r1-transfer.md`.

## Verified behavior

- Full `VITEST_MAX_WORKERS=1 npm run validate`: 180 test files pass; 3,252 tests pass, two skip. Format, lint, typecheck, source validation/replay, build, demo, art validation, admission check and wardrobe check pass.
- `npm run inventory:art`: 409 records. `npm run qa:art`: contact sheet and report regenerated.
- Wardrobe check reproduces 12 reduced bodies and 19 non-enlarged garments byte-for-byte; checks only banked hashes for 49 historical enlarged candidates. It does not recreate or accept those enlargements.
- Browser, one worker, zero retries, isolated port 5291: seven existing character/office tests pass; all ten candidate-review/R1 tests pass. Actual pointer save/recompose and keyboard reload, wardrobe typeahead and candidate controls activate successfully.
- World serialization preserves all four proof identities while their tops change in both DEV and real candidate libraries. Production portrait adapter renders two exact authored appearances, and ordinary generated people retain named placeholders.
- Final corpus check passes after browser edits: 52,133 literals, 1,914 inventoried, 345 files; seven artifacts byte-identical (HTML differs only in recorded commit).

Initial full validation failed on stale corpus output and sandbox-denied local port binding. The regenerated corpus and permitted local server run pass without changing timeouts, seeds or bounds. Initial new browser checks incorrectly used End on a native select and assumed every initial school scene had placed occupants; corrected to actual keyboard typeahead and canonical named people. The final browser run passes. Existing room placement remains covered by scene unit tests and authored office browser tests.

## Visual findings and usable scope

[DEV saved formal combinations](saved-formal-dev.png) show complete reusable fixture combinations. They are regression art, not production likenesses.

[Real candidate saved formal combinations](saved-formal-real.png) prove stable identity and changing clothes, **not usable production fit**. Visible defects include undersized/low collars, exposed gray mannequin areas, inconsistent head/hair proportions, and shoes below the frame. These are actual alignment/fit problems; they do not show that the underlying pixels are absent. D-068 prevents treating legacy pg anchors as authoritative production repair data.

[Normalized standing candidate](normalized-standing-candidate.png) shows a low garment collar, exposed body regions and shoes between the feet. [Seated candidate](seated-candidate-gaps.png) shows the missing seated lower garment and an ill-fitting upper garment. The existing gameplay-scale review framing clips the top of these figures. Full-figure inspection framing is a remaining review engineering defect; it must not be disguised by altering anatomical measurements or the 3% fit bound.

[Ordinary player at 1440](normal-player-people-1440.png) and [at 1200](normal-player-people-1200.png) show the canonical HUD fallback and named people. The People overlay/rail overlaps some underlying scene/HUD content; shared layout integration belongs to UI-PLAY. No calibrated room occupant is invented when the current scene does not support one.

Usable existing authored A01/B01 appearances continue through the real office consumer and exact saved-seed portrait adapter. No new approved complete Wave A person is delivered. Remaining needs are authoritative body/attachment landmarks, exact-pair ease-preserving fit and skin/face mapping, native-size garment masters where recoverable, real seated lower-garment coverage, full-figure review framing, and owner visual/rights acceptance. Blank faces are missing features; unknown compatibility and failed measurements are not synonymous with missing pixels.
