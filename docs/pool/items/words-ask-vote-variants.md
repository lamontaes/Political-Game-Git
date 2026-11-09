---
id: words-ask-vote-variants
title: "A colleague's ask for a vote plays one of several arcs, picked from the posts, the party, the earlier votes, the town and the tie"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: story/ask-vote-variants
pr: pending
blocked-on:
lead: words
source: owner, Nov 8 ("they've gotta have like a variance ... you could get 30 different scenes within there") and Nov 9 ("add a bunch of different scenes and scenarios and variants")
claimed-at: 2026-11-09T11:00:00.000Z
---

**What.** The ask-vote scene (a colleague asks the player for a vote on a bill) played one arc however the colleague came. It now has four variants beside the plain one (whip, trade, watched, friend), chosen by the one arc-variant engine from records the leadership, parties, record, legislature, voting and closeness code already keep. Each variant has its own arc (whip offers a quiet `decline`, trade offers `relent`) and its own bank pieces under `ask-vote.<variant>`. Every variant keeps the plain arc's endings and what each keeps (favor-owed, promise, trust-lost, relationship-strained).

**Rules.** One engine for every kind of scene (`arc-variant.ts`). No dice, no thresholds: scores slide. Weights are TUNABLE under SG-STORY-arc-variant-weights. A scene where the player asks (`playerAsks`) plays the plain arc.

**Done when.** src/director/ask-vote-variants.test.ts, in a town of a drawn place and seed where a sponsor asks a member the evening before a floor vote, shows the scene playing the variant with the highest score with its reads equal to the records (party, post, town margins, closeness), and labeled probes moving whip by a post and a shared party and trade by earlier votes, and a staged ask naming the earlier bill; src/director/arc-variant.test.ts composes every ask-vote variant whole.

**Files.** src/director/arc-variant.ts, src/director/purpose-scene.ts, src/director/data/arc-variants.json, data/english/parts/scene-talk.json

**Notes.** Reads added to the engine: `shared-party`, `holds-post`, `favor-given`, `town-on-bill`. A trade names the bill through the new `earlier` slot. Gaps: no record of a party-line vote or a whip's count by name (a post of any kind stands for the whip); a favor is the asker's yes vote on a bill the asked person sponsored; `caught` is reached only when the asker holds a record that contradicts a lie, as in the plain arc.
