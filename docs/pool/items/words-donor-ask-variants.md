---
id: words-donor-ask-variants
title: "The donor's ask plays one of several arcs, picked from the gift and the two people's records"
area: words
kind: feature
priority: 2
size: M
status: done
claimed-by: story/donor-ask-variants
pr: #8019
blocked-on:
lead: words
source: owner, Nov 8 ("they've gotta have like a variance ... you could get 30 different scenes within there") and Nov 9 ("add a bunch of different scenes and scenarios and variants")
claimed-at: 2026-11-09T07:00:00.000Z
---

**What.** The donor-ask scene played one arc however the donor came. It now has four variants beside the plain one (small, large, friend, again), chosen by the one arc-variant engine from records the campaign-gift and scene engines already keep: the gift against the donor's own year, its share of what others gave, the closeness of the two people, earlier gifts from the same donor and earlier asks the candidate put off. Each variant has its own arc and its own bank pieces under `donor-ask.<variant>`.

**Rules.** One engine for every kind of scene (`arc-variant.ts`). No dice, no thresholds: scores slide. Weights are TUNABLE under SG-STORY-arc-variant-weights.

**Done when.** src/director/donor-ask-variants.test.ts, in a campaign of a drawn place and seed, shows each gift of the played campaign playing the variant with the highest score with the gift's record among its reads, and controlled causes on the same two people moving to small, large, friend and again by the gift's record, the tie and the earlier put-off replies; src/director/arc-variant.test.ts composes every donor-ask variant whole.

**Files.** src/director/arc-variant.ts, src/director/data/arc-variants.json, data/english/parts/scene-talk.json, src/director/data/stopgaps.json

**Notes.** Reads added to the engine: `fact` (a number on the cause record), `closeness` (the tie), and a `where` filter on `history`.
