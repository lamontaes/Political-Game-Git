---
id: press-comment-why-party-reason-played
title: "After a state legislature vote, the reporter's why never hears the party"
area: words
kind: wiring
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: press-comment-why-answered-by-the-roll
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Account lead, Nov 15 23:00Z
---

**What.** After a state legislature vote, the reporter asks a legislator why, and no answer says "My party is for it. So am I." because no played call has reached a state vote yet. The Words lead's party lines wait in /mnt/project-files/words-lead/press-comment/after-vote-lines.md.
Seen: on the reporter's call after the player votes as a state legislator.

**Cause.** Found in code: `positionOfMember` in src/core2/modules/legislature.ts gives a party part only to a state or federal official (`officialParts` in src/core2/modules/officials.ts); a town member's is zero by design, and every pinned vote so far is a town board's. `WORDED_REASONS` in src/director/vote-stand-facts.ts leaves `party` out until a played call says it.

**Fix.** Pin a state legislature vote with the player seated, cast through the game's own vote press, where party is among the two largest parts leaning the way they voted; read `top-reason-party` on the reporter's call; add `party` to `WORDED_REASONS` and the Words lead's party lines for the vote that played.

**Time box.** 2 hours, one Opus session at medium. The lines are the Words lead's.

**Rules.** No hand-made roll row. No line ships unplayed. One rule, all places: the state is drawn and pinned by seed, never named in code.

**Done when.** In a played world built by `buildBenchWorld` at a pinned place and seed, the player votes as a state legislator, and the reporter's call that follows answers why with the party, cited to the roll's record id; a pinned test shows it and a second session plays it.

**Waits on.** Nothing.

**Files.** src/director/vote-stand-facts.ts, data/english/parts/scene-talk.json, a new pinned test under src/director/

**Notes.**
