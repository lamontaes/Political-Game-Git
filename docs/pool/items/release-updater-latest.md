---
id: release-updater-latest
title: "Check for updates in the installed Mac app finds the newest release"
area: release
kind: bug
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
size: S
source: 'astra order 2 "Owner plays it"; windows-package stopgap'
claimed-at:
---

**What.** The release workflow already refuses to publish without latest-mac.yml, but nothing checks that the feed it publishes matches the files beside it, which is what the installed app's Check for updates reads. Add a step to .github/workflows/release.yml, before the draft is made public, that reads latest-mac.yml and latest.yml in the staged folder and fails unless each names the release's own version, a zip or exe that is in the folder, and that file's real size and sha512. Put the parsing in a small script under desktop/scripts with a node test in desktop/tests, so the check is proven on the feeds of the live releases (v0.19.1 and v0.19.2 both carry them) without a Mac. The step that needs the owner's Mac, installing an older build and pressing Check for updates, stays a play check.

**Rules.** Wire to the world: the check runs on the real staged release files, not a fixture the builder wrote, so a bad feed stops the release. Replace, never layer: the inline existence test for latest-mac.yml in the publish step becomes this check instead of sitting beside it. One rule, all 56 places does not bind release machinery, but nothing in the script names a place or a version number; the version comes from the release being built. Look before you ask: the updater's own refusal rules are already covered by desktop/tests/updater.test.mjs and are not rebuilt.

**Done when.** A test in desktop/tests/release-feed.test.mjs passes on the latest-mac.yml and latest.yml of the two newest published releases and fails on a copy whose size, sha512 or version is changed; the release workflow run that publishes the next release shows the step passing. This is release machinery, not a played-world feature. The owner plays it: installs the older Mac build, presses Check for updates and sees the newer one offered.

**Files.** .github/workflows/release.yml, desktop/scripts/check-release-feed.mjs, desktop/tests/release-feed.test.mjs

**Notes.** Order 2 PR #4316 merged; verify end to end.

Checked Oct 15 by a Claude session. The release side is right: release.yml requires latest-mac.yml before it publishes, uploads every packaged file to a draft and then publishes it as the latest release. The live v0.7.0 release is marked latest and carries latest-mac.yml, latest.yml, the dmg, the zip and both blockmaps; latest-mac.yml names OurCivicDuty-0.7.0-mac-arm64.zip with the same size (691509502) as the uploaded zip. The updater's decisions (version compare, downgrade and channel refusal) are covered by desktop/tests/updater.test.mjs. What cannot be checked from a cloud session is the installed Mac app moving from one release to the next: only one release exists, and the swap needs the owner's Mac. When v0.7.1 publishes, the owner (or a checker on the Mac) installs v0.7.0, presses Check for updates and confirms it offers and installs v0.7.1.

Oct 20 (pool feeder): spec written; the 'second release' blocker is gone (v0.19.2, v0.19.1 and earlier are published with both feeds), so the feed guard is buildable now; the Mac install step stays with the owner, and desktop/tests/updater.test.mjs says signed automatic installation is unproven until signing credentials exist.
