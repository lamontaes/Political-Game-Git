---
id: words-inaugural-oath-never-plays
title: "The President's inaugural never says the oath: every oath piece needs a fact the inaugural does not hold"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Desk, Nov 16, pressed walks for words-addresses-are-scenes-with-ties
---

**What.** No inaugural plays an oath sentence: 18 of 18 inaugurals at the address step-3 head said salutation, occasion, one point and close only. The 212 oath uses each need hardest, best, home-state or the Vice President, and the inaugural never holds the first three.
Seen: Santa Rosa, New Mexico, seed 2624d83b-7513-4e4b-8155-249aa71b8d3a, pressed walk, the President's inaugural with no oath.

**Cause.** Found in code: src/director/speech-outline.ts `worldFacts` sets hardest and best only from `themeTopics`, the theme's economic measures, and an inaugural's theme is a policy question (statehood, immigration), so the list is empty; home-state is never supplied (owner, Nov 12, "Why Georgia?"); and src/director/opening-story.ts `within(counted)` drops the Vice President from the oath's facts because the salutation and the occasion already said the name its `namesSaid` budget allows. The oath move is not required, so it is left out.

**Fix.** Give the oath pieces a fact the inaugural holds: the Words lead writes oath lines tied to the theme's question (its own stand slot, the same facts the point uses), or rules the hardest and best wordings read the year's measures whatever the theme. Then put back the two rewordings held from words-addresses-are-scenes-with-ties ("That oath is a beginning, and I meant every word of it, on {hardest} most of all." and "I took that oath knowing what we can still do on {best}, and I mean to keep it.") if those facts are kept. Delete the oath pieces needing home-state with the dead home-state deletion.

**Time box.** 2 hours, one Opus session at medium effort, lines from the Words lead.

**Rules.** Wire to the world: an oath sentence names something the speaker's own record holds, never a slot no record fills.

**Done when.** In a drawn place with a seed nobody chose, a pressed inaugural says one oath sentence after the occasion, and a second session sees it in the running game.

**Waits on.** The Words lead's oath lines.

**Files.** src/director/speech-outline.ts, src/director/opening-story.ts, data/english/parts/opening-speech.json
