---
id: play-stop-27-title-motion-and-rotation-restored
title: "The title painting slowly pans and zooms and fades to the next scene, and a test fails if it stops"
area: play
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: play-first/play-stop-27-title-motion-and-rotation-restored
pr: #6204
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T01:14:11.474Z
---

**What.** On the installed v0.34.0 the title painting sits perfectly still and never changes while the title is open. The owner: "the screen is no longer doing the Ken Burns zoom in, and I'm no longer getting any rotating images. Again, this keeps breaking." The slow pan and zoom and the crossfade between national scenes are ruled (REG:542 and REG:734: "Title motion should retain Ken Burns-style pan/zoom and crossfades among approved eligible environments"); they lived in the old React client that PR #4036 deleted on Oct 12. The new title (src/bench/title.ts, the /api/title route in src/bench/handler.ts, and the backdrop code in src/bench/play.mjs) picks one scene per page load by the date and sets the image once; play.css has no animation on #backdrop and no timer moves to the next scene. This item brings both back, on the existing TITLE_SCENES order, and adds the guards that were never there.

**Rules.** Serves LAW.md §1, Screens and menus (the title is a full-window national scene behind the menu; "title screen = recognizable national scenes", PR-screens:29); REG:542 and REG:734 carry the motion ruling and LAW.md does not yet, so the CTO adds it to LAW.md §1. This is a game, not a spreadsheet: the title is the first picture a player sees. Replace, never layer: the one-scene-per-load path is replaced by the rotation, and the title assertions in desktop/tests/title-screen.test.mjs move out of the desktop suite instead of being copied. No dice: the rotation order stays the day-seeded order in title.ts.

**Done when.** On the bench at 1440x900 in a drawn place, the title painting moves by itself and the title rotates. A new check, src/bench/title-motion.browser.mjs, (1) finds a running animation on the title painting and sees its transform differ between two samples two seconds apart, and (2) leaves the title open past the rotation interval named once in src/bench/title.ts and sees a second scene from TITLE_SCENES fade in over the first (two painted layers, opacity between 0 and 1 at least once) and the first fade out, shown by screenshots two seconds apart and one mid-crossfade. The static title checks (scene list is allowed national scenes and in the backdrop manifest; the menu entries) move into src/bench/title.test.ts with lincoln-memorial in the allowed list, so they run when title code changes and no longer fail on v0.34.0. scripts/agent-test-cadence.mjs plans title.test.ts and title-motion.browser.mjs whenever src/bench/title.ts, play.css, play.html or play.mjs change, with its test updated. Break-it: removing the animation or the timer makes the new checks fail.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The title painting drifts and zooms slowly behind the menu, and after a while it fades into another national scene, and keeps doing so.

**Screenshot.** Three title frames from a drawn place, two seconds apart, plus one mid-crossfade, in the PR body. The title's look ships on the owner's screenshot (LAW.md §1).

**Files.** src/bench/title.ts, src/bench/title.test.ts, src/bench/handler.ts, src/bench/play.mjs, src/bench/play.css, src/bench/play.html, src/bench/title-motion.browser.mjs (new), src/bench/title-lincoln.browser.mjs, desktop/tests/title-screen.test.mjs, scripts/agent-test-cadence.mjs, scripts/agent-test-cadence.test.ts

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "the screen is no longer doing the Ken Burns zoom in, and I'm no longer getting any rotating images. Again, this keeps breaking." Not a v0.34 regression: motion and crossfade went with the old client in #4036 and nothing replaced them or guards them. desktop/tests/title-screen.test.mjs only runs on desktop/** PRs and already fails on v0.34.0 (its ALLOWED list lacks lincoln-memorial, added by play-first-16). src/bench/title-lincoln.browser.mjs loads the page repeatedly to find one scene; it never watches a scene move. The /api/title route counts a visit per call (titleVisits++), so a timer on the page can ask for the next scene or the page can take the ordered list once; the builder chooses. Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
