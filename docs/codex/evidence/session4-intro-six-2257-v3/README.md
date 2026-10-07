# Six intros were captured; people still lack staging records

All six fresh lives completed their introductions and Save. Every presented card has a full-size screenshot. All presented cards were captured, but the engine proof remains incomplete: each observed person/card pair lacks at least one required staging or selection field. These screenshots do not release the scene-content merge gate.

## What was measured

Measured: Monticello, Georgia; Blue Springs, Missouri; Cove, Utah; Thunder Mountain, New Mexico; and Princeton, Kansas each presented seven cards. Capitol Hill, Northern Mariana Islands presented six. The [combined receipt](joint-six-place-receipt.json) preserves all forty-one screenshots, native dimensions, hashes, actual actor traces, saved-world selection projections, and phase timestamps.

Measured: The renderer exposed ninety-five distinct person/card pairs. Five physical placements have actual slot, pose, facing, depth, and appearance data. Their actor joins are missing. The remaining ninety pairs lack physical slot telemetry. Separately recorded unstaged actor selections remain in the receipt; missing telemetry does not mean their canonical records do not exist.

Inferred from source inspection: `src/player/WorldOrientationPanel.tsx:551` draws fixed portrait figures without physical placement selection. No record decides those slots yet. Its trace input at line 418 supplies only the current living-scene chapter's actors. Legislature figures, extra state or congressional figures, and parents can therefore lack a matching selection trace. Every observed person has an individual finding and source reference in the receipt.

## Appearance handoff

Measured: Five BEFORE candidates include the actual person ID, world, seed, moment, place, resolved recipe, registered source-file hashes, and screenshot hash. They are in `pairedBeforeCandidates` in the receipt. Their figure rectangles and browser pixel ratios were not recorded. AFTER screenshots are absent. This is incomplete paired-defect evidence, not an AFTER result.

Measured: None of those five recorded recipes uses feminine afro. The fixed portrait recipes were not captured, so the complete visible cast cannot be checked for that style from this receipt. No character was resampled or relabeled. Session 11 receives this limitation with the source asset hash.

## What happens next

Session 11 owns the physical staging and selection gaps. Session 4 retains the single capture spec and central attendance writer. The owner receives all six sets together. A separately scheduled same-actor AFTER pass must name its actual candidate source and record the missing rectangle and pixel ratio. New scene content remains unmerged pending the owner's proof review.

## Method

Capture ran on the complete source and art from PR 2257 at `487921d051fc034fb266a2a488ab1ff397dc6693`. Capture-only commit `75de2212c01adfcec5fa2d5e6e08a4a96fa8bb86` added the spec. Source, art, and scripts had no delta from the donor. Run `session4-intro-six-2257-full-v3` ended with exit 0: six capture tests passed in 4.5 minutes. Each fresh normal eighteen-year-old life used the existing random-place draw and keyboard Next at a 1920 by 1080 viewport.

The spec retained its content assertions and synchronized to existing loading, current non-inert chapters, and image decode. Production timing did not change. Earlier startup failures, failed browser launches, and the interrupted composition run remain separate attempts. Repository-owned Prettier passed for every added recognized file against the refreshed upstream `93d37feea2184e54a33559d388443c705b5bad55`. The earlier warning against stale `161a9a9a7` named a brief already in current main; it was not repaired or silently counted as a pass.
