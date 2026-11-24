---
id: promises-public-pledge-and-personal-promise-one-record
title: "A candidate's public pledge and a person's promise in a scene are one record of a word given"
area: core
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: medium
root: none
source: Account lead's ruling on core-promises-kept-and-settled-by-the-engine, Nov 15, 2026 (leave the pledges and the vote promise alone in that PR; file one item saying what would make them one)
checked: opus 2026-11-15
---

**What.** A word given is kept in three places: the promises engine (a promise made in a scene the player played), the campaigns module (a stance a candidate says in public), and the legislature (a member's vote traded in committee). Each settles or is held against the speaker its own way, so a news story, a vote count or a voter who heard a pledge cannot ask one place whether someone kept their word.
Seen: a candidate who pledged a stance on the stump and then voted against it is not held to it by the engine that decides whether a promise was kept.

**Cause.** Found in code: src/core2/modules/campaigns.ts writes a `promises` row per stance said (`promise:<candidate>:<date>:<act>:<venue>:<question>`, near line 5318) and the voters who heard it observe it; src/core2/modules/legislature.ts emits a `vote-promise` event for each accepted committee trade (`vote-promise:<bill>:<chamber>:<member>`, near line 5727); src/core2/modules/promises.ts keeps a scene's promise in `core2-promises-v1.promises` and settles `hold-question` and `vote` kinds on the roll and the desk. The first two never reach the third, so nothing settles a public pledge or a traded vote as kept or broken.

**Fix.** Read first what each record is for. A public pledge is owed to everyone who heard it (the observed voters), not one person, so it is a promise with many owed or a row the promises engine reads by question; a traded vote is a `vote` promise between the member and the sponsor. Make the campaigns module's stance row and the legislature's trade write through the promises engine (one kind row each in src/core2/data/promises/promise-kinds.json), and delete the copies they keep, or make them views that cite the engine's row. Settlement stays the engine's: the roll, the desk and the window close.

**Time box.** 6 hours for one Opus session; push what passes and set the state honestly when it runs out.

**Rules.** Replace, never layer: the campaign's promise rows and the legislature's vote promise become the engine's rows or views of them in the same change, with what was removed counted. An effect is a read, not a record: a voter who heard a pledge reads its ending from the engine where their view moves.

**Done when.** In a played world at a drawn place named with its seed, a candidate's public pledge and a traded committee vote are rows in `core2-promises-v1.promises`, each ended by the roll or the desk that settles it, and a second session sees a voter who heard the pledge cite that row when their view moves.

**Waits on.** core-promises-kept-and-settled-by-the-engine (open in a pull request).

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/legislature.ts, src/core2/modules/promises.ts, src/core2/data/promises/promise-kinds.json
