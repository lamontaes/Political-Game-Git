---
id: director-catch-up-after-a-public-event
title: "Someone in your life gets in touch a few days after a big public event, and it is never chit-chat: they are weighing a run, a rally is on the way, or they bring you to their party"
area: director
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Account lead's scene build-out, Nov 15, 2026 (owner's rules 143 to 149, given 20:34Z to 20:43Z; plans approved by the Account lead 20:41Z and 20:45Z)"
model: sonnet
effort: medium
root: none
---

**What.** The owner, Nov 15: a college friend calls a few days after the president's speech to get coffee, and the talk is how the player learns about the world; it "sounds innocent", but the friend is deciding whether to run, or a protest or rally is on the way, or the player meets someone from a party committee. A scene that is only talk is not a scene.
Seen: a few days after a printed national story, a friend who lives apart calls or asks to meet, and the talk ends in their run, the player joining a rally, or a new tie to a party's local people.

**Cause.** Design: docs/design/scenes/scene-catalog.md (the scene build-out catalog and its outcome check) and the owner's rules 143 and 147 of Nov 15. Found in code: `decideToRun` (src/core2/modules/candidacy.ts line 630) keeps each run decision with its reasons and already weighs a party's ask (`reasons.partyAsked`, line 298); `actionsOf` (src/core2/modules/public-action.ts line 110) gives the protests and rallies in a place; parties recruit and skip the player by name (src/core2/modules/parties.ts around line 980); ties and closeness are src/core2/closeness.ts.

**Fix.** One situation type, "catch-up", and one purpose, started by a circumstance row on `news.read` (src/director/data/circumstances.json) for a story from a state or national desk, within a few days of the read, cast with the reader the player's record ties them to most closely among those who live apart and for whom one recorded fact holds: an open run decision in a contest still open; a public action in the place on the scene's day; or membership in a party's local organization while the player has neither filed nor joined a party. If none holds there is no scene. The talk opens on the public event as what the person makes of it from their own views, then turns to the fact that holds, and the ending writes through what exists: the player's word joins the friend's run decision as one more reason beside `partyAsked` (a TUNABLE weight row; the only new code), or `joinCase` for the action, or time spent with the party's person through the closeness engine. The narration says who the person is from their tie and office (facts `tie-kind` and `office-title`); the Words lead writes every line. Where the player sees it: the call or the meeting, a few days after the event.

**Time box.** 5 hours for one Sonnet session, one PR.

**Rules.** An effect is a read, not a record: each ending is read by another engine (the run decision, the case, the closeness engine). No dice: who calls is the closest tie with a recorded reason, never a draw.

**Done when.** A second session, on main, in a drawn place and a seed nobody chose, plays a year, sees a catch-up by moment id within days of a national story a person tied to the player read (by `news.read` id), and finds its ending read next: the friend's run decision lists the player's word among its reasons, or the case lists the player, or the closeness record moved; a tied person with none of the three facts never calls about it.

**Waits on.** The public events item (director-public-events-reach-the-director) and the scene tags item (director-scene-tags-from-player-standing).

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/core2/modules/candidacy.ts, src/core2/modules/public-action.ts, src/core2/closeness.ts
