# KIT41 — private reusable asset kit

Export with `npm run kit:art -- export art/manifest/character_candidate_engine41_registry.json /private/tmp/my-kit`, then open the exported `index.html` for the working sources and examples. The six family templates are in `kit/templates/`; every dimension, portrait crop, attachment and contact comes from B's frozen source manifest. These are artwork pixel coordinates, not physical measurements. Each template includes an anchor guide; do not bake the guide into artwork.

The kit contains real separate body, face, hairstyle, shirt/collar, trousers and shoe source files and corresponding imported runtime SVGs. Original raw masters, provenance and SHA-256 records are retained. The current standing pack does not contain a paired long-hair back layer. No seated fit, independent iris tint, new rig, or automatic cross-body fitting is promised here.

## Generate or supply a fitted item

1. Choose the exact family, standing pose and front orientation in `kit/contract.json`. Copy the applicable `kit/inbox/top`, `bottom`, `hair-front` or `footwear` directory to a new inbox. Use the supplied raw PNG/SVG and anchor guide as geometry references. Use the separately named corrected audience image only for style.
2. Supply original artwork on the template's exact canvas (this pack: 600 × 1200). Keep empty canvas transparent, straight alpha, no matte/checkerboard, no rescaling or baked labels. Preserve actual full hair and chin bounds. A shirt's torso and collar, or a hairstyle's declared front/back pair, must remain separate pieces with the exact shared placement. A different body needs its own fitted variant.
3. Edit `bundle.json`: a new stable versioned id, integer version, readable name/category/style/colour/formality, optional browsing category, actual raw source path/hash and rights status. Unknown rights stay `unknown`. `fit` separately declares exact body, pose and orientation; Men/Women/Unisex labels never establish fit or biography. Put each fitted variant under the same logical item id; each variant references its measured existing template.
4. Preserve the full original source master at `provenance.sourcePath`, relative to the inbox or repository; the importer verifies its SHA-256 and copies that master into the immutable item directory, recording preservedSourcePath. Do not substitute a cleaned or downsampled derivative for the raw master. Record external generation/upscale lineage in provenance without claiming native detail.

## Run in the existing repository

```sh
npm run kit:art -- export art/manifest/character_candidate_engine41_registry.json /private/tmp/my-kit
npm run kit:art -- preview /private/tmp/my-inbox/bundle.json
npm run kit:art -- import /private/tmp/my-inbox/bundle.json
```

`preview` writes `preview/index.html` and measured alpha/bounds/errors beside the inbox without registering anything. `import` preserves the raw input, emits prepared embedded-PNG SVGs and coverage masks, records ordinary labels and per-body fit, and appends one immutable private generation. It refuses missing pieces, altered provenance, wrong dimensions/fit, opaque or empty inputs, unversioned ids and overwritten sources. All base generations must already be frozen by their owner. Restart the private preview after import so its catalog is consistent. New instances of the supported classes require data and this command, with no renderer patch.

The existing `register-engine-people29.py --pack=engine-people41 --check` remains B's full-family registrar and frozen-source verifier. The kit wrapper uses that same prepared source, component, attachment, render-piece and fit contract. Body/head authoring and newly drawn poses remain full-family/pose authoring, outside the small garment inbox. A new topology cannot be declared compatible by copying its label.

Each item remains private, draft/pending/unreleased. Importing does not approve art or modify an old save. Old catalog generations and their original source bytes remain available. A new life can choose new assets; an existing pin retains its person's saved appearance and catalog version.

## Working external-source example

`kit/inbox/example` contains footwear generated outside KIT41 by B and fitted to masculine-average standing. The successful import is `kit41-external-shoes-v1`, generation 11. Its true-alpha PNG has 14,504 visible and 705,496 transparent pixels, bounds x141–456 / y1083–1168 and no detected green fringe. `evidence/report.json` records the actual creator and save/reopen proof; `kit/inbox/example/preview/report.json` records intake. This is a round trip of existing external source, not newly generated artwork.

## Appearance controls

Body, Face, Hairstyle, Shirt, Trousers and Shoes share the same complete-outfit transaction before Begin and in Personal. A face needing its matching painted hair opens an explicit proposal; Cancel preserves the previous recipe. Randomize buttons affect only their named choice; the all-appearance button previews a combined change. Begin commits the selected recipe after ordinary life creation. Questionnaire answers finish before the final appearance review, because they can affect the generated identity.

Color controls only expose genuine prepared regions. Current six-body painted art retains its source colors; the UI says so. Older saved families with actual skin/hair/clothing material ramps keep those controls. Eye color is part of the selected painted face; there is no independent iris control. Missing child art is identified honestly.

Technical validation is separate from owner visual acceptance. All captures and artwork are private review material.

## Ownership and verification

KIT41 consumes the exact frozen B standing source and G scene composition at `1d4892257c50d2fcc6b1e16e27915a969ea397d9`. B retains source, resolver, material and generation ownership; G retains scene geometry and room rendering. The generic additive kit registry seam is separate from those source records. No POSE41 acceptance is implied.

Run `node --import tsx scripts/dev-lab/kit41-browser.ts`, then `kit41-consumers.ts` and `kit41-extra.ts` with the private candidate on port 5294. Browser evidence uses real UI activation, decoded layer hashes and disposable saves; output stays outside the Vite source tree. The focused Vitest group is creator-appearance-preview, complete-outfit and kit41 intake tests.

## LEARN

Freeze source hashes before consumer captures. A screenshot receipt can be reused only when the referenced source bytes match. Keep evidence outside watched source folders to avoid hot reload during a save proof. The People Web portrait is decorative within its existing semantic circle: pointer events must reach that one action, while Enter and Space remain on the circle. Never manufacture a color control from an unmasked painted feature.
