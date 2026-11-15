---
id: words-rival-word-player-gives-their-side
title: "Let the player give their side when a teller moved a lot by a rival's message asks to hear it"
area: director
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: director-rival-word-placed-by-its-record
source: Words lead's ruling on #9416 (second reader's read of the Hopkinton RI play), Nov 15
lead: words
standard: 2
model: opus
effort: medium
root: none
---

**What.** In the rival-word scene a teller moved a lot by a rival's message used to say "I'd like to hear your side" and the talk ended there, because the player had no reply that gives a side. The line was changed to "I'm still making up my mind about {issue}." so nothing is promised that the scene cannot do; the player still cannot give their side to a teller who is open to it.
Seen: the second reader's read of the Hopkinton RI play (seed rwscan:8), Sep 22 scene, rents.

**Cause.** Found in code: in `purposeScene` (src/director/purpose-scene.ts) the rival-word packet has the facts `moved-lot` and `own-stand`, but the scene's reply menu (data/english/parts/scene-talk.json, purpose rival-word, step reply) holds no move that tells the teller the player's side of the question, and nothing writes the telling to the views engine as a cause the teller receives (src/core2/modules/views.ts stance causes).

**Fix.** Add a reply "give my side" offered when `moved-lot` is on the record and the player's own stand on the question is known (`own-stand`), written through the views engine's existing cause path so the teller's stance moves by what the player said, and worded by the bank from the player's stand; the teller's answer is read from the stance after, never a fixed line.

**Time box.** 4 hours for an Opus session.

**Rules.** One engine per mechanic: the views engine's cause path, not a new one. No dice: the teller moves by their traits and the stance, never a roll. No hand-written player text: bank pieces only.

**Done when.** A second session sees, at a place drawn from all 56 (name the place and seed), a teller moved a lot by a rival's message; the player gives their side; the teller's stance on that question moves by the views engine's row (named by record id) and the teller's next line matches it.

**Waits on.** director-rival-word-placed-by-its-record (PR #9416) for the packet facts.

**Files.** src/director/purpose-scene.ts, data/english/parts/scene-talk.json, src/core2/modules/views.ts

**Notes.** Filed Nov 15 by hand on the rival-word branch.
