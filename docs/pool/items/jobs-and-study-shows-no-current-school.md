---
id: jobs-and-study-shows-no-current-school
title: "Jobs and study shows a 17-year-old no current school, only No current job"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: none
source: written by hand for pool/notes (opus-d23b, Nov 11, the play-stop-08 replay)
checked:
---

**What.** In Kalaheo, Hawaii (game seed 16e416d5-7ed4-4aa0-884d-577b1479f37d, main ff69a6fd23e, a life started at age 17) You, then Jobs and study shows Work: "No current job" and nothing about the school she is at; the You tab has no school line either. Only the history says "I started school at Kalaheo Public Schools. I went on to middle school. I went on to high school." A high-school senior's screen should name the school she is at now. Seen: the Jobs and study tab of the You screen for a player under voting age.

**Cause.** Found in code: `jobs()` in src/bench/play.mjs (line 3508) draws the job plate from `me.card.job`, or `controls.jobs.noJob` and `me.card.noJob` when there is none, and never reads `me.card.schoolNow`. src/bench/card.ts (line 186) still computes `schoolNow` (the latest school while the person is under voting age) for the player's own card; no screen reads it since the You screen moved to the strip layout.

**Fix.** In `jobs()`, when `me.card.schoolNow` is set, draw the school in the Work plate (a label from src/bench/data/controls.json, then the school's name from the record) beside or instead of the no-job line, the way a job is drawn. Add the one label to controls.json with `Review: words`; no text in play.mjs.

**Time box.** 1 hour for one Sonnet session.

**Rules.** No hand-written player text in code: the label is a control name and the school's name comes from its record. One rule, all 56 places: the school is read from the player's own school record, the same way in every place.

**Done when.** src/bench/character.browser.mjs (or a new browser check) starts a life at age 17 in a drawn place, opens You, Jobs and study at 1440x900 and finds the school name from `card.schoolNow` on the screen, with the place and seed in its output and the screenshot; it fails with the old `jobs()`. A second session sees it at age 17 in a drawn place.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/data/controls.json, src/bench/character.browser.mjs

**Notes.** Found by opus-d23b replaying play-stop-08-no-high-school-at-seventeen on main ff69a6fd23e. The only school name shown anywhere is the district's ("Kalaheo Public Schools", from the history line), which answers that item's question: the name is the district's, not the school's. The bust on the You screen was an empty glow in the same shot.
