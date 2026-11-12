---
id: words-purposes-departure
title: "The day the player goes into prison, someone who stays asks something of them, from the sentence record"
area: words
kind: feature
priority: 2
size: S
status: in-pr
claimed-by: story/purposes-news-departure-2
pr: 8088
blocked-on:
lead: words
source: CTO brief, Nov 9 ("a purpose for every scene kind that lacks one"); the golden path's "meet people" step
claimed-at: 2026-11-10T00:30:00.000Z
---

**What.** The `departure` scene (the justice engine's `justice.imprisoned`, the player going in) had no purpose. It now plays `departure-ask`: someone in the player's home who stays asks for something before the player goes (to write, to call when they can, to tell the child themself, to keep out of trouble, to come home on the day they get out, to allow a visit). The term, the day the player gets out and the child at home come from the justice engine's own record and rows through the one custody-facts reader the homecoming and prison-visit scenes already use, so no new facts file was needed. The type reads the player as the one leaving, not someone else leaving the player's circle: another person's departure is `moving-goodbye` (#7909).

**Rules.** No new engine. A reply is written by record id; no dice.

**Done when.** src/director/departure-scene.test.ts, in worlds drawn from places, stages the sentence and custody rows and the `justice.imprisoned` record as the justice engine writes them (a sentence is rare in a played year), lets the director cast the departure on its own, composes it through the purpose engine with the term and release cited to that record, and writes a reply that keeps a promise by record id.

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/data/stopgaps.json, data/english/parts/scene-talk.json

**Notes.** Stopgaps: SG-WORDS-departure-ask-unrecorded, SG-WORDS-news-departure-promise-unread. The sentence is hand-staged in the test (labeled); the cast, the scene and the reply are the engines'. Voice read: self-surrender and prison farewell accounts, which gave little direct family speech.
