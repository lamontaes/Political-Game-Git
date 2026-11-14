---
id: people-player-can-call-or-visit-a-relative-in-trouble
title: "The player can call or visit a relative who is ill, in prison or grieving"
area: people
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: rc3-thin-life-record
source: Words lead ruling on the relative-news carry (#9124), Nov 14, 2026
checked: s3 2026-11-14
---

**What.** When a relative falls seriously ill, goes to prison or dies, the house tells the player, and the player's replies ("Need anything?", "Can we visit?", "Can I help?") write nothing back: there is no call or visit the player can make to a relative, so a line like "Let's call them together" would be only words. Seen: the talk at home when a relative's news is told, and the Travel and People screens.

**Cause.** Design: `docs/design/life-record.md` (each person keeps one short list of what they went through, written by the running engines): a call or a visit is a thing a person does with a relative, so it needs a record on both sides (the player's day, the relative's contact with the family) that other engines read: the relative's mood and stress, the journal, the next talk. Nothing in the people or health engines holds a contact with a relative who lives elsewhere (a husk), so no line can name one.

**Fix.** Add one action, "call a relative" (and "visit" where the relative is in reach), through the existing people action path: a record between the two people that the relative's mood and stress read, that the journal and the next talk with the house can name by record id, and that costs the player's day time. Words for it come from the English engine. Do not add a second contact system.

**Time box.** 4 hours, Opus medium.

**Rules.** No dice; a husk stays minimal until met; speed bar; replace never layer.

**Done when.** In three drawn places (fresh seed, each named), the player calls a relative after the house has told the news, the record is on both people, and the next talk with the house can say they called, by record id. A second session, on main, plays one of those places and sees the call in the day and the talk.

**Waits on.** `lives-husk-relative-illness-never-reaches-the-house` for illness news; death and prison news can use it now.

**Files.** src/director/conversation.ts, src/core2/modules/people.ts

**Notes.** Filed on the #9124 branch (claude/words-carry-8959-family-news). Words lead ruling Nov 14 (rulings-3.md #1): the reply "Can we visit?" is cut from the prison talk until a visit is an act the game stages; this item carries it, and when the visit exists the reply comes back with its answer. Also cut, same reason: "I'll find out and tell you", "I'll tell you what I learn" and "I'm not sure how it works. I'll ask." (they promise a later telling or an errand no record holds; a later telling needs the teller to bring up the relative's next change through the brought-up path).
