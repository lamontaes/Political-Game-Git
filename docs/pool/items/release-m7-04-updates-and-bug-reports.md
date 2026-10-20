---
id: release-m7-04-updates-and-bug-reports
title: "M7-04 Updates and bug reports"
area: release
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr:
blocked-on:
milestone: M7
source: "docs/roadmap/later-specs-draft.md M7-04"
claimed-at:
---

**What.** Automatic updates, content updates without a reinstall, in-game bug reports with logs, crash reports. (Owner: Anyone free.)

**Rules.** Spec approved by the owner Oct 12; AGENTS.md rules.

**Done when.** A test update installs itself, and a bug report arrives with its log.

**Files.** see spec

**Notes.** Priority 3 until scheduled. Verify how much is built before starting.

Checked Oct 20 (claude, claude/political-game-pool-76ksvw), one clause of five: "no developer or proof pages in the shipped build" now has a guard (`src/bench/shipped-build-no-developer-pages.test.ts`): the client builds from `src/bench/play.html` alone, `desktop/play-api-host.mjs` runs the play server with `developer: false`, and `/api/build` is refused with 404 when it is off. Not looked at: the nightly cloud build, updates through Steam on Windows and Mac, Mac signing and notarization (`desktop/electron-builder.yml` has `identity: null` and `notarize: false` until credentials exist), and "Report a bug" and the after-crash prompt sending a log only when the player presses send (no such control was found in `src/bench` or `desktop`; that part looks unbuilt).
