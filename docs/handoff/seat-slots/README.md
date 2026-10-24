# Seat-slot rebuild

The twelve room atlases now use independent person masks, fixed chair IDs, rigid person alignment, and empty-room furniture occlusion. Existing Firefly JPEGs and old masks are preserved. The game does not render these assets yet.

## Rebuild

From the repository root, with Python, NumPy, SciPy, Pillow, and OpenCV installed:

```sh
bash tools/seat-slots/rebuild_all.sh /tmp/seat-slots-review
# Or rebuild one room into a fresh directory:
bash tools/seat-slots/rebuild_all.sh /tmp/seat-slots-one school-board-room
python -m unittest discover -s tools/seat-slots -p test_geometry.py
```

The output directory must be new. The wrapper reads `art/backdrops/`, `art/seat-slots-source/`, and each room's `chairs.json`. It builds cuts, records rejected whole candidates with `diag.txt`, checks three variants per chair, applies the existing lighting process, packs matching atlases, and makes review sheets and renders. It does not publish incomplete builds over committed assets. Night previews exist only when the room has a night backdrop.

All 286 original JPEG versions have independent Mask R-CNN person masks in `<version>.persons/`, with hashes and tool provenance. Rebuilding from these masks needs no model download. `segment_people.py` can create masks for new sources using torchvision's Mask R-CNN ResNet-50 FPN V2 COCO V1 weights. Native-generated replacements have saved PNGs, prompts, alpha masks, and provenance. `generated.json` places these existing sources in measured chair slots; it can reference a source in another room folder.

Room flow is estimated at source resolution. A median shift from a ring around each person translates that person rigidly; the body is never warped. A finished cut-out is scaled once. Mask connectivity is checked before subtracting foreground furniture, because a desk can legitimately separate visible head, hands, and legs. No fragments are attached, and `clean_edges.py` is removed from the pipeline.

`review.json` records whole candidates rejected during visual review. No rejected cut-out is repaired with another filtering pass. `report.json` counts rejected candidates and reasons; one candidate can have multiple reasons, so reason totals can exceed the rejected count. The complete flag means the minimum variant count is satisfied, not that visual review is automatic.

## Review and scope

Every published room has a labeled sheet and full/third/available-night previews. The sheet's adjacent JSON maps each numbered cell to its source and chair. Inspect the sprites and renders before copying a new build's packed files, report, and review artifacts into the repository. Keep rejected candidates with their diagnostics in the source folder.

Chair geometry reuses the previous occupied inventory, matched to empty-room detections and hand-marked desk boundaries. Duplicate bench positions were merged. Gallery seating was not expanded to every visible chair. Activity metadata remains `plain` by default and has not been comprehensively classified. These are asset drafts for review, not a claim that every visible chair or activity is finished.

Six focused geometry tests pass. Source hashes, mask dimensions, minimum variant counts, atlas bounds, and unchanged originals were checked. The American English sweep could not collect: its existing `git ls-files` call exceeds Node's default synchronous output buffer (`ENOBUFS`). The full game suite was not run for this asset-only change.
