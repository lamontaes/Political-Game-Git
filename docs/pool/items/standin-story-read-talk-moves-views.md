---
id: standin-story-read-talk-moves-views
title: "A household talk about a story someone read moves the reader's and the player's view of the story's question"
area: words
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10
lead: words
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** When the player talks over a news story with someone at home (the story-read scene), they can agree, disagree, ask or put it off. Today the talk writes the reply, time together, a strain on the tie and an owed talk, but nobody's view of the story's question moves from it. Closes stand-in SG-WORDS-story-read-talk-moves-nothing. Seen: in the household talk and the views shown on a person's page.

**Cause.** Found in code: src/director/purpose-scene.ts (marker comment near line 510, the story-read facts) writes a `scene.reply` event with typeKey `story-read` (same file, `applyCoreEvent` near line 1805); src/core2/modules/views.ts listens to every event (`eventKinds: ["*"]`, `onEvent`) but has no branch for a story-read reply, and `stanceAfterCase` is only fed speeches, stories and cases made.

**Fix.** In the one views engine (src/core2/modules/views.ts), add a branch in `onEvent` for a `scene.reply` whose typeKey is `story-read` and whose move is `agree` or `disagree`. Find the `news.read` record from the reply's `causeId`, get the story's question (`questionAbout` as purpose-scene.ts does), and call `stanceAfterCase` for the other person in the talk (the one who answered), with `speakerId` the person who brought the story, `nearness` from the closeness between the two (src/core2/closeness.ts), `learnedFrom` the `news.read` record id, and the direction (enact or not) from the move. Do the same for the person who brought the story when the player's answer differs. Write nothing else; no new table. Then delete the stand-in marker comment and mark SG-WORDS-story-read-talk-moves-nothing resolved in src/director/data/stopgaps.json.

**Time box.** 4 hours.

**Rules.** An effect is a read, not a record: the new move is read by the views engine and shows in the person's stance record with the `news.read` record as its cause. No dice: size slides with closeness and engagement. One rule, all 56 places. Speed: one reply is one event, so one stance update on the day of the reply; nothing scans the world.

**Done when.** A second session plays a story-read talk in a generated world in a drawn place (place and seed named), agrees or disagrees, and sees the other person's stance on the story's question move by an amount that follows how close they are, with the `news.read` record id in its causes; a stranger's stance moves less than a housemate's. A talk put off moves nothing.

**Waits on.** Nothing.

**Files.** src/core2/modules/views.ts, src/director/purpose-scene.ts, src/director/data/stopgaps.json

**Notes.** Stand-in triage Nov 10 (chunk 2). Red desk, Nov 13: src/director/story-read-scene.test.ts was deleted with the talk-only scenes in #8922 (c87a517a), so Files no longer names it; whoever builds this reads first whether the story-read scene still exists.
