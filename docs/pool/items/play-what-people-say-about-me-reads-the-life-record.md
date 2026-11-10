---
id: play-what-people-say-about-me-reads-the-life-record
title: "The You screen's 'What people say about me' reads the life record: what the people around the player remember of them, as sentences"
area: play
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: CTO review of the life record design, Nov 10, 2026 (pull request 8111, note 1); the approved mock docs/mocks/2026-11-07-approved/menu-examples.html, the You example
---

**What.** The approved mock of the You screen has a section, What people say about me, that the game does not build. The life record (docs/design/life-record.md) gives every full person one list of remembered events, each with the other people it names. This item makes that section a reader of the same list: for the people closest to the player, the events on their lists that name the player, worded as short sentences in their voice from the English engine's banks, grouped by person. It is sentences, never a timeline: the owner withdrew the timeline on Nov 7 (on their life again i said no timeline) and called the old You screen just an excel sheet of facts. Where a person is shown with a face it is the bust (owner, Nov 7: we're going to keep the busts).

**Rules.** A view that computes or stores its own version of a fact is a duplicate (owner, Oct 28): the section calls the life record's one reader and keeps no list of its own. No hand-written player text: every sentence comes from the English engine's banks and passes the words machine's rules. Screens follow the approved mocks and the shared controls (screen-to-mock). Ask why: each sentence opens its record in Trace.

**Done when.** A second session, on main in a drawn place with a seed nobody chose, plays sixty days as a character of 35 or older, opens the You screen and takes a screenshot of What people say about me: at least three people each say at least one sentence that names something they and the player both went through, by record id, Trace on each sentence opens the record, and the section matches the approved mock's structure with no dated list. A bench test in a drawn place, named with its seed, checks that every sentence's record id is on both people's life records.

**Files.** src/bench/play.mjs, src/bench/card.ts, src/core2/person-life.ts, data/english/parts/person-history.json, docs/mocks/2026-11-07-approved/menu-examples.html

**Notes.** After: core-life-record (its first step, the list and the one reader, is on branch claude/fable-life-record-list). The Journal moves to the same reader in a later step of core-life-record.
