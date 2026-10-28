---
id: play-screens-sitting-oct28
title: "The Oct 28 sitting's screen points, from the kit: Politics, Campaigns as the real ballot, News as a newspaper, Travel's place view, every Continue and Back removed, Guide as hover text, no initials, title and creator fixes"
area: play
kind: feature
priority: 1
size: L
status: in-pr
claimed-by: screens/sitting-oct28
pr: #6703
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T17:39:05.370Z
---

**What.** docs/coordination/playtest/2026-10-28-1.md points 1 to 7, 12 to 25 and 27 to 31, each a unit, each from the UI kit (docs/ui/kit13), each its own PR. The helper traces in the CTO session name the file and line for each point; re-derive from the kit and the mocks (docs/ui/mocks/screens-2026-10-14/shots/gov.png, issues.png; art/newspaper-mockups).

**Rules.** screen-to-mock; player-screen-text; kit-only-ui guard; no English in code (labels through the screen-words bank); AGENTS.md one UI package ruling (Oct 28 02:00). Remove, do not replace, where the point says remove. No words, director or English engine edits: those are the words item.

**Done when.** Each point is a merged PR with a browser-check screenshot in docs/play-first/shots; the Politics menu matches the gov mock with headshots and clickable people; Campaigns lists the coming ballot's real races, clickable, with hot links to the filing office; News renders as the paper with story bodies when the words item lands them; no Continue or Back on any menu; Guide text on hover; the title's Patch notes opens the notes file; the creator's Continue shows what is missing; Back returns to the states list; a Random place button exists.

**Files.** src/bench/play.mjs,src/bench/play.html,src/bench/play.css,src/bench/ui,src/bench/data/controls.json,src/bench/government.ts,src/bench/places.ts

**Notes.** lead: play-first. Filed by the CTO on the owner's go (Oct 28).
