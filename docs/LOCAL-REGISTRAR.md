# Local registrar

Things a cloud session cannot do, written as exact commands to run on the Mac.
Each entry says what is blocked, why, and what to run.

---

## 2026-09-21 — three approved regional plates could not be fetched from Drive

**What is blocked.** Five regional scenes are owner-approved and
integration-ready on the Art Bench. Two were fetched into the repository and
committed byte-exact. Three could not be: the Google Drive connector available
to a cloud session fails with `MCP server "Google_Drive" session expired` on
every file above roughly 7 MB, reproducibly, across retries. The two that
succeeded are 4.99 MB and 5.29 MB; the three that fail are 7.14 MB, 7.86 MB and
7.88 MB.

This is a transport ceiling, not a permissions problem. The catalog, the events
index and the two smaller plates all came through the same connector.

**Effect on play.** `art/regions/regional-scene-places.json` records those three
regions with `"plate": null`, so the resolver reports
`matched-region-has-no-plate` and the intro shows no picture for them rather
than a wrong one. Nothing is broken; three approved pictures are simply absent.

**What to run.** The files are already on the Mac in the Drive mirror. Copy them
in under their repository names and verify the hashes:

```bash
cd ~/Documents/Political\ Game/Political-Game-Git   # your checkout
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
# expect 7c46ac03d9f7fa3e545caf26a675cba1d2e710ceaa5573dd38be256b3c83bfcd
shasum -a 256 "$DEST"/env_regional_pacific_temperate_rainforest_v1.png
# expect 0a82edbe6dbf9d0ef8c88f4ddb32917133ea57e4e823cb0a9c6e72a7c230ff0e
shasum -a 256 "$DEST"/env_regional_norcal_oak_woodland_v1.png
# expect c3cc8800440d77db4b63d563d7d48357629392f0db474b9c1526bae72fb0e818
```

Then record them in the coverage document. Each entry's `plate` goes from
`null` to the four facts the gate checks — the path, the sha256 above, the real
pixel dimensions, and the bench candidate id:

| region key                           | candidate id                                | pixels      |
| ------------------------------------ | ------------------------------------------- | ----------- |
| `socal-inland-bungalow-neighborhood` | `cand-8fd6953d-04f9-f787-19de-9b770bff7b96` | 2576 x 1616 |
| `pacific-temperate-rainforest`       | `cand-4163d8ca-7ad4-4853-86ce-ccd8e30aa889` | 2512 x 1664 |
| `norcal-oak-woodland`                | `cand-dee5a58b-5a28-e810-a8a6-fbe319f2f67b` | 2352 x 1760 |

Verify, and commit:

```bash
npm run validate:regional-scenes -- --check
npx vitest run src/authoring/regional-scene-coverage.test.ts
git add art/families/regional-opening art/regions/regional-scene-places.json
git commit -m "regional-opening: receive the three remaining approved plates"
```

Do not re-encode, downscale or optimise these PNGs. Approval is of those exact
bytes and the gate re-hashes them.
