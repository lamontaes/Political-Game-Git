---
id: release-play-api-figure-staging-local
title: "Repair play-server figure staging with local bundle and HTTP evidence"
area: release
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The main desktop release builds and validates the game but its staging step rejects a figure lookup outside the repository. Repair the existing standing-figure route and prove the bundler and served image in the merger environment against the exact failing main. This bounded item covers the locally verified root repair; release-main-red-play-api-figures retains the next platform staging run as an open follow-up.

**Rules.** Red main comes first: repair the packaging failure at its source before resuming the ordinary merge queue. Replace, never layer: repair the existing figure route and retain the bundler repository boundary check rather than adding a bypass or alternative server.

**Done when.** On exact clean main the play-server bundle command fails with the reported outside-repository path error. On the fixed merged-main head the same command succeeds, copies every standing figure unchanged, and an actual HTTP request serves a copied figure with status 200, image/png and identical bytes. The changed-file checks pass, with any pool baseline errors reproduced on the exact integrated main; the existing parent item stays open for the next platform staging confirmation.

**Files.** src/bench/handler.ts, desktop/scripts/build-play-api.mjs

**Notes.** TODO
