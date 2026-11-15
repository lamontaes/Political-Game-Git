---
id: director-after-race-turned-precinct-more-cases
title: "Race night and the morning after say the precinct that turned for the player, in a win, and the player's own precinct"
area: director
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: director-after-race-turned-precinct (#9446), the Account lead's call Nov 15 that only sentences that played ship
---

**What.** #9446 ships the swing against the player (three sentences). The Words lead wrote thirteen more that never played in the two played runs, because a world decides the win, the swing and the precinct. They come back each with a played proof: the swing for the player after a loss ("Precinct N came over to you." / "It wasn't enough."), a win with a swing for ("It was Precinct N." / "It wasn't ours last time.") or against ("We won. But we lost Precinct N."), the morning wordings for the swing for ("Precinct N came over." / "Remember that next time."), and the player's own precinct ("We lost your own precinct.", "Your own precinct came over to you.", "It was your own precinct.", "We won. But we lost your own precinct.", "I keep thinking about your own precinct.", "Your own precinct came over."). Seen: in the race-lost and victory-night scenes on race night and the morning after.

**Cause.** Found in code: src/director/race-turnout-facts.ts `turnedPrecinct` returns the precinct and its direction, but `raceTurnoutFacts` hands only `turned-against` to the scene, and src/director/data/purpose-arcs.json gives only `concession-call` the `stateMoves` ["turned", "turned-then", "request"]. The facts `turned-for` and `turned-own` (the player's household's precinct, `pollingPlaceOf`) were removed because no played line read them.

**Fix.** Re-add the fact each sentence reads in `raceTurnoutFacts`, add `stateMoves` to `victory-night`, and add each sentence from /mnt/project-files/words-lead/after-the-race/turned-precinct-lines.md as parts with `requiresFacts`, only after src/director/turned-precinct-played.test.ts (TURNED_PRECINCT_DRAW picks the place) has played it at the final head. Find a place and seed where the player wins or the swing is for them by running it at more places; no sentence ships unplayed.

**Time box.** 4 hours, most of it the played runs (about 20 minutes each).

**Rules.** No count spoken. A sentence ships only if it played at the final head.

**Done when.** A second session sees each added sentence played at its exact head in the played file, naming the place and seed.

**Waits on.** #9446 folding.

**Files.** src/director/race-turnout-facts.ts, src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json, src/director/turned-precinct-played.test.ts
