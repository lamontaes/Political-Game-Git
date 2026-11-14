---
id: words-heard-from-a-person
title: "A person who turns the player down over something they heard says who they heard it from, when a person told them"
area: words
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: words
source: S6 (brief J, asking someone to serve), Nov 14 2026
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** A person who turns the player down over a story they heard names the outlet today. When a neighbor or friend told them instead, the line should name that person, once. The record of who told whom is the conversation engine's. Seen: the ask-to-serve scene's no.

**Cause.** Design: docs/pool/items/world-picks-read-serve-willingness.md and the Words lead's ruling of Nov 14 05:28Z: the `heard` reason names the outlet today (`outlet` fact from `storiesHeard`); hearing it from a person (a conversation record) is not read.

**Fix.** Read the talk record that passed the story to the person (conversation engine) and give the scene a `heard-from` fact naming them; lines use it once.

**Time box.** 2 hours for one sonnet session.

**Rules.** No dice: an answer comes from the person's record. One rule, all 56 places.

**Done when.** A second session, in a drawn place with a seed it did not choose, plays it in the running game: In a played world, a refusal over a story heard from a neighbor names the neighbor, by record id.

**Waits on.** nothing.

**Files.** src/core2/modules/serve-asks.ts, src/director/purpose-scene.ts
