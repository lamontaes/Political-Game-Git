---
id: director-street-news-scene-ends-after-its-opener
title: "Street scenes say someone has news, or stopped you about yesterday, and end with nothing said"
area: director
kind: bug
priority: 2
size: M
status: claimed
standard: 2
claimed-by: claude/project-thread-5efbu8-arrival
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: rc2-done-from-records
source: "Playtester P3, Nov 13, 2026 (crew line #8928)"
checked:
claimed-at: 2026-11-15
---

**What.** About every other week, a seated selectboard member's Wednesday 8:00 AM street scene shows only its opener, such as 'First thing on August 27th, Sasha Neal walks up to you in the street. Sasha has news for you.' or 'Stephen Pugh stops you in the street about what happened yesterday.' The talk box offers one Continue. Pressing it ends the scene with nothing said and puts a second Continue on the clock bar. In four played months this happened on Jun 18, Jun 25, Jul 16, Jul 23, Aug 20, Aug 27, Sep 10, Sep 17, Oct 1, Oct 22 and Oct 29. Three of them (Sep 10, Sep 17 and Oct 1) were followed straight away by a Journal toast about the income tax changing the player's costs. Seen: the street scene, and the clock bar after it.

**Cause.** Measured: North Hyde Park, Vermont, seed a6b481a5-c6c9-432b-8cca-c0463c518da8, main 9ebc7c89. Pictures are in Playtester P3's walk w35 (07-scene and 08-stop, Aug 27). The openers are the lead 'lead-news-arrives-other' and the opening 'opening-deliver-news-deliver-news' in data/english/parts/scene-words.json (lines 856 and 2014). Both belong to the news-arrives situation type (src/director/data/situation-types.json, line 310). That type's causes include law.effect-learned, which src/core2/modules/place-prices.ts (line 730) writes for the income tax change. Found in code: not yet. The cause is unconfirmed, but the guess is that the talk built for a news-arrives moment whose cause is law.effect-learned (or a street circumstance) has no turns, so the scene closes after its lead. The fixer confirms this by casting the Aug 27 moment through /api/dev/scene-cast and reading which turns compose.

**Fix.** First confirm the cause above. Then fix one of two ways: give the scene its turns (the bearer tells the news the record holds, and the player replies), or have the director turn a moment with no turns into its journal line rather than stage a scene that promises news. A scene that says someone has news must say the news (scene-standard: a scene exists only if it writes something back).

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Scene standard: a scene exists only if it writes something back, and its narration never promises what it does not deliver. No hand-written player text: the bearer's lines come from the banks, and the Words session writes any that are missing. One rule, all 56 places.

**Done when.** A second session plays a seated official in a drawn place, named with its seed, for three months on main and finds no street or news scene that ends after its opener. Every 'has news for you' scene says the news, by its record id. A director test over drawn places finds no staged news-arrives moment that composes zero turns.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/director/scene.ts, data/english/parts/scene-words.json, data/english/happened-words.json, src/english/happened-words.ts, src/director/arrival-says-what-happened.test.ts

**Notes.** More cases (Account lead T25, Nov 13, 2026; Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train c39bbb71): 'First thing on May 2nd, at school, you talk with David Norman.' then a bare Continue; 'First thing on December 16th, you stay in. Your father has news for you.' / 'We have to move.' / 'Wait. We have to move?' / 'I'll be around this morning if you need me.' and nothing more. 'about what happened yesterday' opens most door and visit scenes where nothing happened the day before.

Arrival part (election-results thread, Nov 15, 2026, branch claude/project-thread-5efbu8-arrival; Account lead's order, Words lead's lines in /mnt/project-files/words-lead/arrivals/happened-lines.md). Measured: Sheridan, Wyoming (5669845), seed 7, Advanced start as selectboard member person_0f713cf2e3e20027, Train 29ef4685: in 30 days 21 first lines read "thinking about what happened on January 21st" or "talk over what happened yesterday", and none said what. Found in code: src/director/scene.ts gave every arrival a `since` date from the cause and no fact for what the cause was. Fixed there: `since` is gone; a first line says what happened only through the `happened` fact, filled from the cause record's bill, law, topic or offense (words table data/english/happened-words.json); 16 arrival pieces reworded and 6 deleted (they spoke for nobody). Each of the six settings keeps its plain arrivals. Still open on this item: the scene that ends after its opener (the street and news scenes with no turns); the arrival fix does not touch it.
