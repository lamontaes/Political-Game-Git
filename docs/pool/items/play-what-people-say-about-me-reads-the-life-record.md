---
id: play-what-people-say-about-me-reads-the-life-record
title: "The You screen's 'What people say about me' reads the life record: what the people around the player remember of them, as sentences"
area: play
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/pool-play-what-people-say-about-me-reads-the-life-record
pr: #8762
after:
blocked-on:
standard: 2
model: opus
effort: medium
root: design-life-record
lead: screens
source: CTO review of the life record design, Nov 10, 2026 (pull request 8111, note 1); the approved mock docs/mocks/2026-11-07-approved/menu-examples.html, the You example
checked: fable 2026-11-10
claimed-at: 2026-11-11T08:13:53.088Z
---

**What.** The approved mock of the You screen has a section, What people say about me, that the game does not build. The life record (docs/design/life-record.md) gives every full person one list of remembered events, each with the other people it names. This item makes that section a reader of the same list: for the people closest to the player, the events on their lists that name the player, worded as short sentences in their voice from the English engine's banks and grouped by person. It is sentences, never a timeline: the owner withdrew the timeline on Nov 7 and called the old You screen "just an excel sheet of facts". Where a person is shown with a face it is the bust (owner, Nov 7).

**Cause.** Design: docs/design/life-record.md (one list of remembered events per full person) and the approved mock docs/mocks/2026-11-07-approved/menu-examples.html (the You example); the owner withdrew the timeline on Nov 7. The life record's reader (the old src/core2/person-life.ts is gone) is built by core-life-record, which has not landed.

**Fix.** Build the What people say about me section on the You screen as sentences per person, read from the life record's one reader and worded by the English engine, grouped by person, with Trace on each sentence opening its record, and no dated list. Show the same section on any person's card (What people say about them), built by the same function in src/bench/card.ts, with the gold tag beside each speaker drawn from the temperament recorded on that speaker (the reader at card.ts line 151). Keep no separate quote record: every sentence is a view of a life-record entry.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** A view that computes or stores its own version of a fact is a duplicate (owner, Oct 28): the section calls the life record's one reader and keeps no list of its own. No hand-written player text: every sentence comes from the English engine's banks and passes the words machine's rules. Ask why: each sentence opens its record in Trace. Screens follow the approved mocks and the shared controls (screen-to-mock).

**Done when.** A second session (not the builder), on main in a drawn place with a seed nobody chose, plays sixty days as a character of 35 or older, opens the You screen and takes a screenshot of What people say about me: at least three people each say at least one sentence naming something they and the player both went through, by record id, Trace on each sentence opens the record, and the section matches the approved mock's structure with no dated list. A bench test in a drawn place, named with its seed, checks that every sentence's record id is on both people's life records.

**Waits on.** core-life-record (the list and the one reader).

**Files.** src/bench/play.mjs, src/bench/card.ts, data/english/parts/person-history.json, docs/mocks/2026-11-07-approved/menu-examples.html, docs/design/life-record.md

**Notes.** After: core-life-record (its first step, the list and the one reader, is on branch claude/fable-life-record-list). The Journal moves to the same reader in a later step of core-life-record.
