---
id: words-news-lead-not-bad-news
title: "Ordinary news at home never opens with 'asks you to sit down first'"
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by: lane3/news-lead-not-bad-news
pr: #7202
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T07:45:17.570Z
---

**What.** The Confirmer's replay of path 1 (Haleyville, Alabama, replay ab5f58e9be125c95, main 99d774785b): the talk after the President's address opened 'Your partner asks you to sit down first.', which reads like bad news coming, then the talk was about the speech. The news-arrives lead at home played that line for any news.

**Rules.** Narration never misleads about what follows (scene-standard). Hard news at home has its own opener (family-open).

**Done when.** No news-arrives lead says 'sit down first'; scene-lead-fits-setting.test.ts still finds a home-only lead that plays at home; the English guards pass apart from main's own reds.

**Files.** data/english/parts/scene-words.json

**Notes.** Filed by Lane 3 (Nov 4) from the Confirmer's note on path 1.
