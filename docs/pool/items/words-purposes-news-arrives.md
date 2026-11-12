---
id: words-purposes-news-arrives
title: "News a household member brings (a death, a pairing, a parting) plays a scene with a purpose: they ask the player for something, from the news record"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: story/purposes-news-departure-2
pr: 8088
blocked-on:
lead: words
source: CTO brief, Nov 9 ("a purpose for every scene kind that lacks one"); the golden path's "meet people" step
claimed-at: 2026-11-10T00:30:00.000Z
---

**What.** The `news-arrives` scene had no purpose, so a death in the family or a relative's new partner played generic talk. For the three causes where a household member brings the player news about someone else (`life.death`, `family.partnered`, `family.separated`) it now plays `news-ask`: the bearer asks the player for something the news brings (to call the family, to come over, to tell the friends, to meet the new partner, to keep it quiet, to call or sit with the one left). The news is the record: `src/director/news-facts.ts` reads who it is about, the other person in a pairing or parting and whether the bearer lived with them, each cited by id. A cause can now name its own `purpose` (scheduling.ts, `typeForCause`), so one type plays a purpose for some causes and plain talk for the rest: news the player carries to their household, and news of an eviction, a job, an illness, a prison term or a street rumor, stay as they were. #7909 (merged) covered `story-read`, `notice-home` and `moving-goodbye`, not these.

**Rules.** No new engine. A pairing or parting the player is a party to is not news to them, and news about a person the world no longer holds is skipped rather than worded as "someone". A reply is written by record id; no dice.

**Done when.** src/director/news-arrives-scene.test.ts plays a year of drawn places with every full person watched (the engines' own deaths, pairings and partings reach the circle), composes every such moment through the purpose engine, finds each fact cited to its record, writes a reply that keeps a promise by record id, and sees a gone person's news skipped; the English and families guards pass.

**Files.** src/director/news-facts.ts, src/director/purpose-scene.ts, src/director/scheduling.ts, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/data/stopgaps.json, data/english/parts/scene-talk.json

**Notes.** Stopgaps: SG-WORDS-news-ask-unrecorded, SG-WORDS-news-departure-promise-unread. Not done: news of an illness, a job lost and an eviction still play plain talk (care-visit and favor-job already give those a purpose elsewhere). Voice read: the guidance and forum threads on breaking news of a death (say it plainly, warn first, then pause).
