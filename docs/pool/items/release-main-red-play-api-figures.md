---
id: release-main-red-play-api-figures
title: "Desktop staging stops: the play server's figure lookup names a folder outside the repository"
area: release
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #6071
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Main release run 40215933110 (source 8d0dd8f295, the merge of #6049) built the game on macOS and Windows, then both desktop package jobs failed at 'Stage the compiled game and its play server': 'Play API reads /Users/runner/work/Political-Game-Git, outside the repository.' desktop/scripts/build-play-api.mjs copies every folder a bundled module names with new URL(..., import.meta.url), reading the static part of a template; src/bench/handler.ts serves the v2 standing figures with new URL(`../..${url.pathname}`, import.meta.url) (4a0c9c8ee4, Oct 24), whose static part '../..' resolves to the repository root, so the script takes its parent. No desktop release publishes until this is fixed.

**Rules.** Red main comes first (owner, Oct 15). A fix lands where the failure reproduces.

**Done when.** desktop/scripts/build-play-api.mjs bundles the play server on the fix branch and fails on main with the same message; the next main release run's desktop package jobs pass staging. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/bench/handler.ts

**Notes.** Found by the speed lead while confirming #6049's release run.

Merger 0, Oct 26: PR #6071 lands the bounded local repair release-play-api-figure-staging-local after an exact-main bundle failure, corrected bundle and HTTP figure-byte proof in the merger environment. This parent stays open for its unchanged next-platform-staging Done when; no queued or green GitHub badge substitutes for the local gate. The newer failed Release 40253254777 also stops at this route, Windows job 121352482445 reporting the outside-repository path.
