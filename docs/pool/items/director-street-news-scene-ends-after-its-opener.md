---
id: director-street-news-scene-ends-after-its-opener
title: "Street scenes say someone has news, or stopped you about yesterday, and end with nothing said"
area: director
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: rc2-done-from-records
source: "Playtester P3, Nov 13, 2026 (crew line #8928)"
checked:
claimed-at:
---

**What.** About every other week, a seated selectboard member's Wednesday 8:00 AM street scene shows only its opener, such as 'First thing on August 27th, Sasha Neal walks up to you in the street. Sasha has news for you.' or 'Stephen Pugh stops you in the street about what happened yesterday.' The talk box offers one Continue. Pressing it ends the scene with nothing said and puts a second Continue on the clock bar. In four played months this happened on Jun 18, Jun 25, Jul 16, Jul 23, Aug 20, Aug 27, Sep 10, Sep 17, Oct 1, Oct 22 and Oct 29. Three of them (Sep 10, Sep 17 and Oct 1) were followed straight away by a Journal toast about the income tax changing the player's costs. Seen: the street scene, and the clock bar after it.

**Cause.** Measured: North Hyde Park, Vermont, seed a6b481a5-c6c9-432b-8cca-c0463c518da8, main 9ebc7c89. Pictures are in Playtester P3's walk w35 (07-scene and 08-stop, Aug 27). The openers are the lead 'lead-news-arrives-other' and the opening 'opening-deliver-news-deliver-news' in data/english/parts/scene-words.json (lines 856 and 2014). Both belong to the news-arrives situation type (src/director/data/situation-types.json, line 310). That type's causes include law.effect-learned, which src/core2/modules/place-prices.ts (line 730) writes for the income tax change. Found in code: not yet. The cause is unconfirmed, but the guess is that the talk built for a news-arrives moment whose cause is law.effect-learned (or a street circumstance) has no turns, so the scene closes after its lead. The fixer confirms this by casting the Aug 27 moment through /api/dev/scene-cast and reading which turns compose.

**Fix.** First confirm the cause above. Then fix one of two ways: give the scene its turns (the bearer tells the news the record holds, and the player replies), or have the director turn a moment with no turns into its journal line rather than stage a scene that promises news. A scene that says someone has news must say the news (scene-standard: a scene exists only if it writes something back).

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Scene standard: a scene exists only if it writes something back, and its narration never promises what it does not deliver. No hand-written player text: the bearer's lines come from the banks, and the Words session writes any that are missing. One rule, all 56 places.

**Done when.** A second session plays a seated official in a drawn place, named with its seed, for three months on main and finds no street or news scene that ends after its opener. Every 'has news for you' scene says the news, by its record id. A director test over drawn places finds no staged news-arrives moment that composes zero turns.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/director/scene.ts, data/english/parts/scene-words.json
