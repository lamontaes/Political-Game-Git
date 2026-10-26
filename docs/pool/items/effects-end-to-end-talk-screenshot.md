---
id: effects-end-to-end-talk-screenshot
title: "A screenshot of the end-to-end proof's talk in /play: an assault victim says it to someone they know"
area: director
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: claude/effects-end-to-end-talk-screenshot
pr: #6161
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T07:53:37.899Z
---

**What.** The effects end-to-end proof (src/core2/effects-end-to-end.test.ts, PR #5912) follows Saulsbury, Tennessee (seed 6f539fcfdf6d96f9, 150 households met) from the town's December 2025 unemployment to crime.victimized:assault:household_4e07b185b4629ed1:2025-12-04, the victim person_32c9f82c590ec88c's stance on the police line, the director's moment and a talk with person_8b103d8fa883c300 in which the victim says "Someone attacked me yesterday." in ordinary play. Its done-when asks for a screenshot of that scene. scripts/people/scene-shots.ts draws a staged scene's figures and backdrop but not a talk's lines, and /play has no way to open a given world on a given day.

**Rules.** No hand-written player text: the line on screen is the English engine's, from the talk. Generated-world proof: the world is the test's own seed and place, played through its producers. Read-only screens spend no game time and create no facts.

**Done when.** A PNG of /play’s talk (or the conversation scene the way /play draws it, with the talk’s shipping lines) from the current effects end-to-end buildBenchWorld proof: Santa Rita, Guam, seed 6f539fcfdf6d96f9-5, December 5, 2025, between victim person_72c671bd8e04ee0e and listener person_97eee31ce6e6d376, showing “I got attacked.” from crime.victimized:assault:household_7016a06122c47837:2025-12-04, attached to the effects end-to-end PR body with the script or route and the source record ids.

**Files.** src/core2/effects-end-to-end.test.ts, scripts/people/scene-shots.ts, src/bench/scene.ts

**Notes.** TODO

Reconciled 2026-10-26 in #6161: the original Saulsbury people and sentence were the earlier main proof. The existing effects test now draws through to Santa Rita on the same root seed; the PR already documents that handoff. This item follows that generated proof’s actual people, event and shipping line, with the same screenshot/route requirement. Merger replay found the retained moment and record-backed line; the lossless current capture names Evan Lyons. The primary effects-end-to-end-proof acceptance is unchanged.
