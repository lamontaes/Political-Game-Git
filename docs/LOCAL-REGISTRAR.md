# Local registrar — work that needs a machine this session cannot reach

Every cloud Project thread runs in an ephemeral Linux container with the
repository, GitHub and Drive, and nothing else. This file is the standing list
of work that therefore cannot be finished from a cloud thread, written so that
whoever is at the Mac — Lamontae, a local Claude, Codex, or ChatGPT reading it
back — can execute an entry without asking what was meant.

Each entry says what is blocked, the exact commands to run, and what to check
afterwards. An entry is deleted when it is done. This file is not an archive of
resolved items; if it is still here, it is still outstanding.

> The art, client and release lane maintains L1 to L7, L9 and L10 of this file
> on `claude/current-art-source`. This branch adds L8 and L11 only, numbered
> around that lane's entries so the two sets merge without renumbering. When
> they land, keep this preamble once and both sets of entries.

---

## L8 — Three approved regional plates are too large for the Drive connector

**Blocked:** five regional scenes are owner-approved and integration-ready on
the Art Bench. Two were fetched into the repository and committed byte-exact.
Three could not be: the Google Drive connector available to a cloud session
fails with `MCP server "Google_Drive" session expired` on every file above
roughly 7 MB, reproducibly, across retries. The two that succeeded are 4.99 MB
and 5.29 MB; the three that fail are 7.14 MB, 7.86 MB and 7.88 MB.

This is a transport ceiling, not a permissions problem. The bench catalog, the
events index and the two smaller plates all came through the same connector.

**Effect on play:** `art/regions/regional-scene-places.json` records those three
regions with `"plate": null`, so the resolver reports
`matched-region-has-no-plate` and the introduction shows no picture for them
rather than a wrong one. Nothing is broken; three approved pictures are absent.

**Run, at the Mac:** the files are already in the Drive mirror.

```sh
cd /absolute/path/to/your/checkout
git fetch origin claude/art-bench-requests-sbi892
git checkout claude/art-bench-requests-sbi892

MIRROR=~/Library/CloudStorage/GoogleDrive-lamontaebilling@gmail.com/"My Drive"/00_OUR_CIVIC_DUTY_ASSET_FACTORY_ACTIVE/80_ARTBENCH_EXCHANGE/02_CATALOG/candidates
DEST=art/families/regional-opening

cp "$MIRROR"/7c46ac03d9f7fa3e545caf26a675cba1d2e710ceaa5573dd38be256b3c83bfcd.png \
   "$DEST"/env_regional_socal_inland_bungalow_neighborhood_v1.png
cp "$MIRROR"/0a82edbe6dbf9d0ef8c88f4ddb32917133ea57e4e823cb0a9c6e72a7c230ff0e.png \
   "$DEST"/env_regional_pacific_temperate_rainforest_v1.png
cp "$MIRROR"/c3cc8800440d77db4b63d563d7d48357629392f0db474b9c1526bae72fb0e818.png \
   "$DEST"/env_regional_norcal_oak_woodland_v1.png

shasum -a 256 "$DEST"/env_regional_socal_inland_bungalow_neighborhood_v1.png
shasum -a 256 "$DEST"/env_regional_pacific_temperate_rainforest_v1.png
shasum -a 256 "$DEST"/env_regional_norcal_oak_woodland_v1.png
```

Each hash must equal the source filename it was copied from. Then record the
three in the coverage document: each entry's `plate` goes from `null` to the
four facts the gate checks — the path, that sha256, the real pixel dimensions,
and the bench candidate id.

| region key                           | candidate id                                | pixels      |
| ------------------------------------ | ------------------------------------------- | ----------- |
| `socal-inland-bungalow-neighborhood` | `cand-8fd6953d-04f9-f787-19de-9b770bff7b96` | 2576 x 1616 |
| `pacific-temperate-rainforest`       | `cand-4163d8ca-7ad4-4853-86ce-ccd8e30aa889` | 2512 x 1664 |
| `norcal-oak-woodland`                | `cand-dee5a58b-5a28-e810-a8a6-fbe319f2f67b` | 2352 x 1760 |

```sh
npm run validate:regional-scenes -- --check
npx vitest run src/authoring/regional-scene-coverage.test.ts
git add art/families/regional-opening art/regions/regional-scene-places.json
git commit -m "regional-opening: receive the three remaining approved plates"
```

**Verify:** the coverage gate exits 0 and reports five regions with a delivered
plate. Do not re-encode, downscale or optimise these PNGs — approval is of
those exact bytes and the gate re-hashes them.

---

## L11 — Three regional scene records the Art Bench catalogue cannot settle

**Blocked:** three of the twenty-three regional scenes carry a catalogue defect
recorded as a `sourceNote` in `art/regions/regional-scene-places.json`. None of
them can be settled from a cloud thread, because each needs a look at the
source bank behind the bench rather than at the catalogue row.

- `appalachian-town-january` selects the same sha256 as
  `playtest65-region-pikeville-valley-street`. One of the two records is not
  what it claims. The question is what that shared file actually is: the parent
  both rows derive from, a reference image, or a finished winter output that
  one row is mislabelling.
- `subtropical-mangrove-wetland` selects a record that is 640x432.
- `lower-mississippi-delta-marsh` selects a record that is 688x456.

The last two are preview or reference sizes, not delivered plates. The other
approved regional originals are 2208 to 2576 px. **No enlargement**: scaling
these up and recording the result as native detail is not an option, and the
sizes above are measurements of the selected records, not of any original.

**Effect on play:** all three regions carry `"plate": null`, so the resolver
reports `matched-region-has-no-plate` and the introduction shows no picture for
them. Nothing renders wrongly; three scenes are absent. They are also among the
eighteen regions with no place selectors, so even a correct plate would reach
no player until the place IDs come back (`regional-scene-place-ids` in the
research queue).

**What is needed, at the Mac or from whoever can read the source bank:** for
each of the three, either the larger original with its sha256, or a statement
that the request was never finished and the row should stay without a plate.
For the Appalachian row, what the shared file is, in those three terms.

**Then, in a checkout:**

```sh
npm run validate:regional-scenes -- --check
npx vitest run src/authoring/regional-scene-coverage.test.ts
```

Record the answer by replacing that region's `sourceNote` with the finding, and
adding a `plate` only where a real original was found.
