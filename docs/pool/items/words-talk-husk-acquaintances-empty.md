---
id: words-talk-husk-acquaintances-empty
title: "A talk with a relative who lives elsewhere (a husk) opens empty: no greeting, no news, no choices"
area: words
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Most of the people the player knows at the start are husks: relatives living elsewhere, kept minimal until met (core-od-fill-in-outside-kin). In a played world (buildBenchWorld), 12 of the 14 people the player knew in Lordship, Connecticut were husks, and every talk with one opened with no line and no choice, with the game's own conversation data and the mined bank alike (openConversation, src/director/conversation.ts): no greeting, no news they heard, no subject between them. fillInPerson and personOrFillIn (src/core2/state.ts) return a husk as it is, so the bench's talk open (src/bench/handler.ts /api/talk/open) never fills one in, though the two-level rule says a person is filled in the moment the player meets or clicks them.

**Rules.** Two-level population (AGENTS.md, Keep it simple): a person is filled in the moment the player meets or clicks them, matching what the records already say. One engine: fill in through the core's fill-in, never a second person builder in the director. Words come from the banks.

**Done when.** In a played world of a place drawn from all 56, a talk the player opens with a husk acquaintance shows at least a greeting and one choice, the person is a full person after it (tier no longer husk, their kin and household from the records), and src/english/mined/conversation-bank.test.ts talks with husks again (its non-husk filter, added for the chk2-a and chk2-c red, removed).

**Files.** src/core2/state.ts (fillInPerson, personOrFillIn), src/bench/handler.ts, src/director/conversation.ts, src/english/mined/conversation-bank.test.ts

**Notes.** Oct 30 (Words): found from main's conversation-bank red (Davenport, Florida, seed chk2-a; Point Clear, Alabama, chk2-c: every acquaintance of the test's player was a husk). Played-world evidence: Lordship, Connecticut (drawPlace chk2-a tiers): known weekly 2, husk 12; Maywood, Illinois (chk2-c): weekly 4, husk 12; Captain Cook, Hawaii (tier-x): weekly 1, husk 4. Core owner to confirm how a husk is filled in.
