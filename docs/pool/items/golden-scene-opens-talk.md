---
id: golden-scene-opens-talk
title: "A scene with a speaker opens into the talk; no Talk step, no Leave on its narration"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: golden/scene-opens-talk
pr: #6491
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-10-28T02:30:50.996Z
---

**What.** When the director stops time for a scene with a person, the talk box shows the narration with a hand-typed "Talk · Name" reply and a Leave button. The player must click Talk before anyone speaks, and that control is the Talk button the owner removed. It happens at golden path step 2 and in every campaign scene after it, so the owner meets it a dozen times a season.

**Rules.** No hand-written player text (AGENTS.md): the "Talk ·" label is typed in code, so it goes. Clicking a person starts the talk, no Talk button (OWNER-DECISIONS, Oct 27, 5 PM): a scene that brings a person to you starts their talk the same way. No Leave or Say nothing on narration (OWNER-DECISIONS, Oct 27, 6:20 PM): the narration beat no longer stands alone with a Leave under it. LAW.md section 4: the narrator sets the scene and the characters then play it out.

**Done when.** In a drawn town on the bench, a scene with a speaker shows its narration with the speaker's first line and their four replies under it at once, with no "Talk ·" control, shown by a before and after screenshot with the place named; and the circumstance-scene.browser.mjs test passes in a drawn place.

**Time box.** 2 hours.

**You will see.** A scene starts with its narration in italics and the person's first line right under it, with four replies to choose from; nothing to click first.

**Screenshot.** Before and after at 1440 by 900 from a drawn town, place named, in the PR body.

**Files.** src/bench/play.mjs, src/bench/circumstance-scene.browser.mjs

Oct 29 (CTO): set done; PR #6491 merged (the done flip failed while branch protection refused the flip job's push).
