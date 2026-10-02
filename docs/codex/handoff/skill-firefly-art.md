---
name: firefly-art
description: >
  Run Our Civic Duty's Firefly art pipeline: queue generations in one or more
  browser tabs, check they landed, download, check at full size, cut posed
  sheets into the people pack, and import backdrops. Use for capitols, lights and
  seasons, poses, outfits, faces, hair, facial hair and accessories.
---

# Firefly art pipeline (Claude CTO, approves art himself)

Tabs: Browser pane tabs on firefly.adobe.com/generate/image (tab-5, tab-7, …). The model (Nano Banana 2, gemini-3.1) persists per account.

- **Helpers:** after a reload, inject `cto-notes/firefly/firefly-helpers.js` (the __walk, __ocdGenerate, __ocdSetRefFiles, __ocdFile, __ocdSetAspect, __errCount and __genRun parts), then `cto-notes/firefly/poses/queue-builder.js` (__F and __M outfit texts, __outfitPrompt, __queuePose, __SHEETS URLs).
- **Queue:** `window.__genQueue` items are `{key, refs:[url], prompt:"[key] …", aspect:"Square (1:1)"|"Widescreen (16:9)"}`. `window.__genRun(80000–90000)` runs it. `unshift` puts urgent items first. The prompt starts with `[key]` so the asset name carries it.
- **Refs:** the page fetches at.adobe.com and Wikimedia URLs. Upload local files with `asset_initialize_file_upload` (file_size = the LOCAL byte count), a curl PUT, then `asset_finalize_file_upload`. The presignedAssetUrl lasts for hours.
- **Words:** no body words in prompts ("chest", "underwear"); say "gray athletic outfit" or "shorts". Men and women get their OWN body language: men explain with a low firm hand or a thumb point, and stand with hands in pockets; women get their own set.
- **Did it land?** The runner's error count misses some failures. Confirm with `asset_search` (GenAIAsset, sort createDate desc, query the key) and requeue what's missing.
- **Download:** `asset_get_presigned_urls` (acp ids), then curl the downloadUrl.
- **Full-size check:** paired sheets (output beside reference) at 1000 px. Look for extra or missing limbs, lettering, tree branches through leaves, overhanging edge trees, and the wrong material or colors against the real building.
- **Poses:** `python3 cto-notes/firefly/poses/cut_poses.py <pose>` cuts bare plus outfits into poses/<pose>/ (canvas 1024×1536, head fixed). SOLO overrides handle a build its neighbor covered. Then build the pack in a worktree:
  `node --import tsx scripts/appearance/build-people-pack.ts /Users/lamontae/Documents/PG-LAND/output/modular-bare-standing-front-v1/prepared/bodies-floor-v1 /Users/lamontae/Documents/PG-LAND/art/generated/candidates/art-desk/overnight-wave-2026-09-27/people-appearance /tmp/packout`,
  diff it against art/people-engine/v1 (existing files unchanged), copy it in, add a release note, and open a PR. PG-LAND is read-only.
- **Capitols and backdrops:** `node scripts/art-asset-factory/import-capitol-backdrops.mjs <dir>`, where the dir holds `state-capitol-xx__<variant>.png` plus sources.json with assetId, prompt, referencePhoto, license and artist.
- **Throughput:** about 38 per hour per tab at 80–90 s spacing, with zero errors at two tabs.

Record every run in cto-notes/TALLY.md.

**Refs without uploading (Sept 28):** the repo is public, so the Firefly page can fetch any committed image at
`https://raw.githubusercontent.com/lamontaes/Political-Game-Git/main/<path>` (CORS allowed). Use this for backdrops and pack art already on main. Local http servers are blocked by the page.
- **Dropped items:** "no generate button" in `__genStatus.ok` means the item was lost. firefly-helpers.js now ends with a wrapper that retries Generate 4× at 20 s; inject it after the helpers.
- **Solo repaints (overlapping figures):** edit the three-figure sheet to "erase the two on the left... ONE person only"; only about half succeed, so check each with `python3 cto-notes/firefly/poses/qa_solo.py <sex> <build> <original> <solo...>` (one figure inside that build's cutting window, same place), save passes as outfits/raw/<s>-<outfit>-<pose>@<build>.png, and register the build in cut_poses.py SOLO.
- **Hard legs:** "redraw only the legs of the man on the right as an exact copy of the middle man's legs" fixed the fuller man's ankle-on-knee when describing the pose did not.

## Places library (Sept 28 night)
- **Real landmarks from photos** (capitols, universities): `cto-notes/firefly/universities/fetch_landmarks.py` searches Wikimedia Commons per landmark (landmarks.tsv), keeps 3 photos with license; review the lm/ contact sheet by eye, then fetch a clean 1600px link per pick with a *fresh* API call each time (a reused failed response gave several schools the wrong photo). Queue with two refs: an existing painted place for **style only** (`college-quad__midday.jpg`; a capitol ref leaked a dome) and the photo.
- **Generic places**: "Paint a new background scene... Use the reference only for its art style; the place itself is completely different...", blank signs/screens as live surfaces.
- **Keep good mistakes** (Lamontae): a wrong-but-good picture becomes the place it really shows (Brown, Cornell, Montana State, Washington State) or a generic one with markings removed. Reject only real defects.
- **Every kept place needs**: tags for every place it can serve (region, climate, kind, quality), and morning/night/rain/winter variants (edit of the midday: "keep everything, change only the light/weather"; warm places stay green in winter).
- **Import**: `places/import_places.py <worktree>` (per place+variant, keeps other entries), `capitols/import_capitol_lights.py <worktree>` (adds lights, never drops middays; the repo's capitol importer replaces a whole place). Update surfaces.json `checked` lists and the count in place-backdrops.test.ts.
- **Sync downloads**: `cto-notes/firefly/sync_plan.py <saved asset_search json...>` maps truncated `[key]` names to full keys and lists what isn't saved locally yet.
