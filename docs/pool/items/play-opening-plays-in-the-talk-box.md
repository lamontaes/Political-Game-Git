---
id: play-opening-plays-in-the-talk-box
title: "The opening address plays in the shared talk box with Skip scene, and the opening's own speech box and name tag are deleted"
area: play
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: play-first
milestone: play-first
source: CTO opening root-cause report, Oct 27
claimed-at:
---

**What.** The opening has its own renderer: playOpening, holdOpening and pointOut in src/bench/play.mjs:254-373, with its own speech box (#opening-box) and name tag (#opening-point) and their timers. Every other scene plays in the talk box (renderTalk, src/bench/play.mjs:1139) built from the shared parts in src/bench/ui/. The owner ruled one UI system and one scene system on Oct 26. Two renderers for the same speech box is the duplication he named. Evidence: docs/reports/opening-root-cause-2026-10-27.md.

**Rules.** Replace, never layer: the opening box, name tag, their styles and timers are deleted in the same PR and counted. Screen-to-mock: the address uses the shared talk box and panel parts, with "Skip scene" per the Oct 26 menus ruling. No hand-written player text: the speaker card and tags show record names only.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, named in the PR, the address plays through renderTalk with the President's name and office from their record id, Skip scene ends it, grep finds no opening-box or opening-point in src/bench, and screenshots at 1440x900 and 1024x768 show it.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The President's address in the same talk box as every other conversation, with Skip scene.

**Screenshot.** The address's first line and a cutaway, at 1440x900 and 1024x768.

**Files.** src/bench/play.mjs, src/bench/play.html, src/bench/play.css, src/bench/ui/panel.mjs

**Notes.** Filed by the CTO root-cause report of Oct 27 (docs/reports/opening-root-cause-2026-10-27.md). Lead: play-first.
