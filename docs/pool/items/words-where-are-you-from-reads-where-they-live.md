---
id: words-where-are-you-from-reads-where-they-live
title: "Nobody in a played town is ever asked where they are from: the hold reads where they live, not where they were born"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
root: none
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Civic roles builder, Nov 15, while proving #9538 at Edgar, Wisconsin; the Account lead asked for the item"
model: opus
effort: medium
---

**What.** Once #9538 folds, a played town has people born in other states and abroad. In Edgar, Wisconsin (5522550), seed edgar-petition-1, 30 of 145 grown residents were born in another state and 4 abroad, and their cards say so. Nothing in talk can ever bring it up, though. "Where are you from?" never plays. 40 strangers in town all opened on "here", and none led to home. The player's own answer to it (born here, or moved here N years ago) is never seen. Where the player would see it: a neighbor born elsewhere saying where they grew up, and the player's own answer when asked. Seen: where the player talks to a neighbor at home.

**Cause.** Found in code: in `src/director/conversation.ts`, near line 4794, the Words lead's rule 52 ("Nobody asks what they can see... 'Where are you from?' is for when one of the two is not from here") is read as `subject.kind === "home" && other.placeId === player.placeId`. That is where the two live, not where they were born. Every person a player can meet in a played town lives in that town: the 9 places Travel lists at Edgar held 0 people living elsewhere at 10 AM and 2 PM, even with the player seated as a state representative through dev mode. Relatives never raise it (familyTalk.dropped). Where someone was born cannot be seen, so the hold reads the wrong fact.

**Fix.** Ruled by the Words lead, Nov 15 18:26Z: "not from here" means born somewhere else, not living somewhere else. The hold reads each one's birthplace through `bornIn` (src/core2/past-moves.ts): the question plays when either of the two was born outside the place they live. The asker's line and the reply read the same birthplace record, not `placeId`. No new record. Every answer comes from the same record: someone born elsewhere says where (as the card says it), someone born in town says so, and nobody answers with where they live now. The builder lists the bank's answer lines for the question and what each reads; a spot with no true line goes to the Words lead, who writes it. It is asked once between two people, like any fact already told.

**Time box.** 2 hours, Opus.

**Rules.** One rule, all 56 places. No dice: who asks is decided by the records, never a roll.

**Done when.** A second session, on main, at a drawn place and seed, plays talks on the game's own path show the question asked of someone born in another state, someone born abroad and someone born in town, each one's bornIn record beside the answer. The player's own answer reads their record. It is not asked twice between the same two people. Lines are stamped by a words reader at the sha.

**Waits on.** Nothing. It plays best once #9538 (people born in other states) has folded.

**Files.** src/director/conversation.ts, src/director/data/conversation-rules.json

**Notes.** Filed by hand by the civic roles builder, Nov 15. #9538 took its own read of the player's answer out because no player could reach it.
