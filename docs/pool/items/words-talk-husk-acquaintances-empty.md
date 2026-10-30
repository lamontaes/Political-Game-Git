---
id: words-talk-husk-acquaintances-empty
title: "A relative who lives elsewhere has family news to talk about, so a talk with them is not empty"
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

**What.** Most of the people the player knows at the start are husks: relatives living elsewhere, kept minimal until met (core-od-fill-in-outside-kin). A talk with nothing on record between the two says nothing, greeting included (owner, Oct 24: "Hello and goodbye with nothing between is not a talk"; openConversation in src/director/conversation.ts), and between the player and a husk nothing is on record, so every such talk opens empty: 12 of the 14 people the player knew in Lordship, Connecticut. Promoting a husk to a full person does not change it (red main's probe, Oct 30). Relatives have the family to talk about: the household both belong to, a parent's or sibling's job, a move, a birth, a death, a wedding, from the kin and household records the core already keeps. The talk's subjects (subjectsBetween, mainTopic) should offer those, worded from the conversation bank.

**Rules.** Two-level population (AGENTS.md, Keep it simple): a person is filled in the moment the player meets or clicks them, matching what the records already say. One engine: fill in through the core's fill-in, never a second person builder in the director. Words come from the banks.

**Done when.** In a played world of a place drawn from all 56, a talk the player opens with a relative who lives elsewhere raises family news from a kin or household record (cited by record id) and offers at least one choice, with no line the records do not hold; src/english/mined/conversation-bank.test.ts then talks with husks again (its non-husk filter removed).

**Files.** src/core2/state.ts (fillInPerson, personOrFillIn), src/bench/handler.ts, src/director/conversation.ts, src/english/mined/conversation-bank.test.ts

**Notes.** Oct 30 (Words): found from main's conversation-bank red (Davenport, Florida, seed chk2-a; Point Clear, Alabama, chk2-c: every acquaintance of the test's player was a husk). Played-world evidence: Lordship, Connecticut (drawPlace chk2-a tiers): known weekly 2, husk 12; Maywood, Illinois (chk2-c): weekly 4, husk 12; Captain Cook, Hawaii (tier-x): weekly 1, husk 4. Oct 30 (red main, CTO): not a fill-in gap; a husk promoted to weekly still opens an empty talk, and so do two weekly acquaintances two days in. The cause is the Oct 24 rule with nothing on record; the content is the family. The conversation-bank red is fixed in the test (PR #6897) by living a month and talking with people who have a life on record.
