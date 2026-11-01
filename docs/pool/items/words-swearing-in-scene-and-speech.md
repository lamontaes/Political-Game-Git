---
id: words-swearing-in-scene-and-speech
title: "Taking office is a swearing-in scene, with a speech when the office gives one"
area: words
lead: words
kind: feature
priority: 1
size: M
status: claimed
claimed-by: words/swearing-in
pr:
blocked-on:
source: owner, Oct 29 voice note on the governing brief
claimed-at: 2026-10-29T21:33:49.309Z
---

**What.** The owner ruled Sept 22 that "swearing in needs to be an event", and on Oct 29: "Yes, swearing in, it needs to happen... that's just a scene... depending on what your office is, you'll give a speech and... the word session will handle that." Today none of the director's 85 situation types is a swearing-in, so the player is seated silently on the start date (governing brief, Oct 29). The scene fires from the took-office record the offices engine already writes, casts who would be there from the world, and opens an address by office where the office gives one (mayor, governor, president).

**Rules.** Scene standard: the scene is cast from the world and writes something back (the oath on the record, the speech heard). No hand-written player text: the oath, narration and speech come from banks. One engine per mechanic: the speech uses the one address engine (`director-officeholder-address-scene`), not a second speech writer.

**Done when.** In a buildBenchWorld played year from a drawn place where the player is seated, a test names the place and seed and shows the took-office record opening a swearing-in scene with narration, the oath and, for an executive office, an address heard by named people, and a bench screenshot of the scene lands in docs/play-first/shots.

**Files.** src/director/data/situation-types.json, data/english/parts/, src/core2/modules/offices.ts

**Notes.** Filed by the CTO, Oct 29, from the owner's voice note on the governing brief (OWNER-DECISIONS, Oct 29 21:40 UTC). Read: OWNER-DECISIONS, DECISION-REGISTER, the governing brief's four research notes; searched the pool for twins.
