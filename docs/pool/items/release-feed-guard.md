---
id: release-feed-guard
title: "Each package job checks its update feed against the installer beside it before anything is uploaded"
area: release
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #5841
blocked-on:
source: added with npm run pool -- add
---

**What.** The release workflow refused to publish without latest-mac.yml but nothing checked that the feed matches the files beside it, which is what the installed app's Check for updates reads. A step in each package job of .github/workflows/release.yml runs desktop/scripts/check-release-feed.mjs on the staged release-upload folder before anything is uploaded. It fails unless latest-mac.yml and latest.yml name the release's own version and an installer that is in the folder at the path the feed gives, with that file's real size and sha512. This is the bounded feed-guard half of release-updater-latest; the installed-Mac acceptance stays with that item.

**Rules.** Wire to the world: the check runs on the real staged release files, so a bad feed stops the release. Nothing in the script names a place or a version number; the version comes from the release being built. The updater's own refusal rules stay covered by desktop/tests/updater.test.mjs and are not rebuilt.

**Done when.** A test in desktop/tests/release-feed.test.mjs passes on the latest-mac.yml and latest.yml of two published releases (v0.21.6 and v0.22.0, from their release assets) and fails on a copy whose size, sha512 or version is changed and on a feed naming an installer path not in the folder; each package job in .github/workflows/release.yml runs the check on its staged folder before the upload step.

**Files.** .github/workflows/release.yml, desktop/scripts/check-release-feed.mjs, desktop/tests/release-feed.test.mjs

**Notes.** Split from release-updater-latest at Merger's send-back of PR #5841 (Oct 23): the next release's workflow run and the installed-Mac offer, install and launch stay open on release-updater-latest, which this item does not complete.
