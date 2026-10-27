---
id: words-scene-for-unstaged-big-moments-a
title: "A campaign speech that moved you in the room brings the candidate over to ask for your vote; every day-stopping moment with no scene is listed"
area: words
kind: wiring
priority: 2
size: M
status: done
claimed-by: words/unstaged-big-moments
pr: #6136
blocked-on:
source: "split from words-scene-for-unstaged-big-moments by the words-and-scenes lead, Oct 26, answering Merger 1's send-back on #6136"
lead: words
claimed-at:
---

**What.** The in-person half of `words-scene-for-unstaged-big-moments`: a heard campaign speech (a town hall or a campaign event) that moved a listener stages `speech-afterward`, where the speaker comes over and asks for their vote; and a played year lists every day-stopping moment label no situation stages, each given a scene or named with why it stays a journal line. The debate half (a speech heard on the broadcast) stays on the parent item, because no record puts a debating candidate beside a listener.

**Rules.** Words engine: the director stages situations from records, the English engine says them; nobody is drawn without a reason on record. Wire to the world: each scene reads the speech's own record and names who gave it. One rule, all 56 places.

**Done when.** A played year in a drawn place (seed named) lists every moment label whose impact would stop the day but that no situation stages; each listed label either gets a situation type in situation-types.json with its words in the banks, or is named in the PR body with the reason it stays a journal line; a speech heard in the room that moved a listener stages `speech-afterward` with the speaker present, shown by record id, and `src/director/speech-afterward.test.ts` fails if a drawn place's run observes no such in-person scene.

**Time box.** 2 hours (the send-back's merge and acceptance).

**Files.** src/director/data/situation-types.json, data/english/parts/scene-words.json, data/english/parts/scene-talk.json, src/director/scheduling.ts, src/director/speech-afterward.test.ts

**Notes.** Split Oct 26 by the words-and-scenes lead from `words-scene-for-unstaged-big-moments` (Merger 1, #6136: "make the acceptance honest (bounded new item for broadcast speeches, broader item stays open, table aligned)").
