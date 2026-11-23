---
id: talks-close-with-a-goodbye-after-a-turned-back-answer
title: "A stranger who answers the question the player turned back ends the talk with a goodbye"
area: director
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by:
pr: #9719
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Words builder A, Nov 16 (the second reader's played talks for #9697, 14 stops with nothing to press)
claimed-at:
checked:
merged-at: 2026-11-16T20:01:08.270Z
---

**What.** A new acquaintance asks "Where do you work?", the player answers and turns the question back, the person tells where they work and what they do, and the talk stops with nothing to press and no goodbye. Played at South Haven, Minnesota (2761402), seed tw3, five talks (Ray Chavez, Carmen Robinson, Jorge Silva, Kayla Rocha, Emily Rose). Seen: the same five talks end on the person's goodbye.

**Cause.** Found in code: the answer to a question the player turned back is composed in `sayNow`'s tail (src/director/conversation.ts, the block that pushes the reply and calls `offerChoices`), which never closed the talk when no reply was left, unlike `raiseSubject`, which ends it with `endConversation`; the position line ("I work there as a shift supervisor.") is the last line and `conversation.choices` is empty.

**Fix.** One helper, `offerChoicesOrClose` (src/director/conversation.ts), offers the replies and ends the talk when there are none; `raiseSubject` and the answer to a turned-back question both call it, so no line that ends their turn leaves the talk open. A raised question whose `replyFacts` is null is not offered, for every question kind.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** Wire to the world: the talk ends through the one `endConversation` that every other closing already uses, proven in a played world, with no second closing path. No line is added or changed.

**Done when.** At South Haven (seed tw3, `scripts/play-walks`-style walk of 28 talks) the five talks that stopped after a position reply end on a goodbye; a second session walks a talk in a drawn place from all 56 (name the place and seed) and sees no talk stop with nothing to press before a goodbye unless the other person is a housemate or the talk is about hard news.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, scripts/words/dead-end-talks.ts

**Notes.** Nov 16: built in this item's own PR. Test limit 40 s: alone 15.0 and 15.5 s, beside two other talk tests 17.9 s. Not fixed here: six talks at South Haven where a child or a retired person asks "What do you do for a living?", the player answers, and the talk ends on the player's line because an answered question gets no goodbye (item words-no-job-asker-says-where-they-stand); the housemate talks that end on a relative's statement (address-point-back, asked-kin-give) are by design, no goodbye at home (owner, Nov 12). `replyFacts` returns null today for their-work with an employer that has no name, their-position with no sayable title, their-tenure with no years, their-family with a dead relative and their-school with no school; the first four are answered or not offered, see the PR body.
