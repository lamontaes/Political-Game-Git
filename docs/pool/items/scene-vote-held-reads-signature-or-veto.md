---
id: scene-vote-held-reads-signature-or-veto
title: "The replies that say a bill is not decided yet stop playing after the executive signs or vetoes it"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Account lead builder, Nov 15, found merging rule 113 (#9433) onto the Train; Words lead's word to file it, 07:14Z
---

**What.** Six "not decided yet" replies ("You'll have it the same day everybody else does.", "Fine. I'm leaning yes. That's all you get.", "Put this in: I'll vote yes, and I'll own it.", "It's too early to say.", "I want to hear from the people I represent first.", "Let me look at the numbers first.") are excluded on `vote-held` (#9399). In a press comment after a governor or mayor signed or vetoed the bill, they can still play, so the official says the bill is undecided after acting on it. Seen: none of the six is offered once the asked person has signed or stopped the bill.

**Cause.** Found in code: src/director/purpose-scene.ts sets `vote-held` only when the scene's record is a `legislative-vote`; an `executive-action` record sets `signed-it` or `stopped-it` (and `acted`) but not `vote-held`, and the six exclude only `vote-held`.

**Fix.** The one fact the six read also reads the executive's signature or veto on that bill: purpose-scene.ts sets `vote-held` from an `executive-action` record with `signed` or `stopped` as it does from a vote. No second copy of the rule on the six lines (Words lead, Nov 15).

**Time box.** 1 hour, one Opus session at medium.

**Rules.** Ask why: the fact that keeps the six lines out cites the executive action's record id, so the scene says why by record. Tests pinned to a named place and seed, staged through the game's own signing path, with one rule in one place.

**Done when.** A second session signs a bill as the mayor or governor in a drawn place, then takes the reporter's call about it in the running game, and none of the six replies is offered; a pinned test in src/director stages the same signing and checks the scene's replies by record id.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts

**Notes.**
