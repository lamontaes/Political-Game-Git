# PR #95 Wave-A morphology and recent-Drive cargo

Status: candidate/reference mechanical intake only. This cargo releases no pixels, approves no anchors, changes no runtime registration, and changes no production character catalog or release manifest.

## Provenance and review evidence

- Cargo base: PR #95 head `e9fa03b9f8c85ad2e797cad60d9c1c19f0d22736`.
- The exact Drive query window begins `2026-09-02T15:00:00Z` and returned 286 accessible images. Complete provider metadata and reconciled classifications are in `art/qa/p95-recent-drive-sweep/drive-image-inventory.json`; the unmodified provider metadata is retained beside it.
- Exact source-sheet reports are in `art/qa/p95-wave-a-morphology/` and `art/qa/p95-recent-drive-sweep/`.
- The complete 111-component measurement/disposition record is `art/qa/p95-recent-drive-sweep/candidate-component-review.json`.
- The family-separated human review surface is `art/qa/p95-recent-drive-sweep/candidate-contact-sheet.html`.
- The clean-output rerun proof is `art/qa/p95-recent-drive-sweep/source-sheet-determinism.json`; all 12 processed sheets matched source boxes, dimensions, component counts, and output SHA-256 values byte-for-byte.

## Corrected Packet 92B conclusions

1. The five Wave-A morphology sheets are no longer “Drive only / not ingested.” They are preserved, chopped, measured, hashed, and candidate-reviewed. They remain morphology evidence only because their body cells do not satisfy the approximately 1696×2528 production-body floor.
2. Pack 74 B2 front-facing footwear no longer needs generation. `shoes.png` is the corrected front-facing twelve-pair source. It is preserved and deterministically chopped, but remains an unreleased source candidate pending ordinary fit, anchor, and human gates.
3. Additional front-facing clothing sources already exist: twelve feminine-cut tops, twelve masculine-cut tops, and twelve masculine-cut bottoms. They now have deterministic candidate chops, not production approval.
4. Additional eight-pose `fat man.png` and `skinny man.png` morphology sheets already exist and are ingested here. They remain below production-body resolution and do not remove the genuine need for production-resolution body masters.
5. A lanyard/accessory source exists in the extensionless Drive file `supplies` (preserved as `supplies.png`). An earlier lanyard also appears in `IMG_5203.PNG`. The newer sheet is staggered: the accepted chopper detects 12 coarse regions, several containing multiple objects. Item-level lanyard promotion therefore remains a human/pipeline-layout gate; no competing crop method was introduced.

## Remaining genuine generation/revision needs

- Production-resolution body masters remain required. None of the newly found body sheets clears the accepted body floor.
- Clean reusable versions of poses with baked desks, chairs, or lecterns remain required where those poses are needed as modular bodies.
- The corrected footwear, clothing, and accessory pixels require the normal fit, anchor, and human acceptance gates; those are intake/approval needs, not evidence that source art is absent.
- No separate front-facing footwear generation need remains after this sweep.

## Human gates

- Classify/accept pose semantics where the literal row/column evidence is insufficient.
- Decide whether baked furniture variants are useful as interaction-specific references or require clean re-renders.
- Re-layout or otherwise provide an accepted deterministic item-segmentation path for `supplies.png` before treating its lanyard or other merged regions as independent components.
- Review the candidate contact sheet. Nothing in this cargo constitutes visual acceptance.
