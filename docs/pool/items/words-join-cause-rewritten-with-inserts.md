---
id: words-join-cause-rewritten-with-inserts
title: "A neighbor's invitation to a cause asks you to a posted meeting, and your yes is kept or broken by whether you go"
area: words
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by:
pr: 9947
after:
blocked-on:
root: rc4-hand-written-words
lead: words
model: sonnet
effort: medium
source: owner, Nov 14, on the lines the world does not place, and Nov 16, "No. Count them again and rewrite them with inserts", "either that or remove them and start fresh"
---

**What.** The cause's invitation (`join-cause`, played by `cause-invite`) held 227 fixed lines, 209 placed by nothing: "Thursday works. What time?" and "Phone calls I can do." name days and jobs no record holds, and "sign-up sheets, phone calls, maybe speaking at a meeting" promises acts the game cannot settle. The invitation now asks for the one thing the game settles: to come to the next posted meeting of a town body (the `attend` promise, kept by being there and broken by staying away), and the player answers from where their own recorded view on the cause puts them.
Seen: a neighbor with a clipboard shares a cause with the player, the talk names the town body and the night it meets, the player's yes plays only where their view is with the cause, a no from a view against it says so, and no thank-you follows a no.

**Cause.** Found in code: `excusedAs` in tests/guards/english/line-inserts.test.ts counts a line as placed when its use names any fact, so the 209 `join-cause` lines of data/english/parts/scene-talk.json that named a day, a job or a figure no record holds were placed by `after` alone, and `composeBinding` in src/director/purpose-scene.ts set no fact for the posted meeting the cause could be taken to, where the player stands on the cause or whether they sit that night (`asked_against` was read by nothing, now `stand-apart`), so no line could be placed by them. The friend's ask had already been rewritten to ask only for the next posted meeting; no pool item did the same for the cause's invitation.

**Fix.** Delete the `join-cause` lines placed by nothing (223 lines, with their verdicts); 33 new lines are written; keep the lines a fact places; write the families the spec names. Add `causeInviteFacts` in src/director/cause-invite-facts.ts, called from the cause-invite block of `composeBinding`: `meeting`, `body`, `meeting-when` and `item` (the posted meeting, `nextMeetingFacts`), `cause-public`, `stand-with` and `stand-apart` (the views engine, `viewOn`, on the cause's question or budget line against the way it wants it) and `title` (the office the player holds, from the town seats). The cause-invite scene is held when no meeting is ahead (`nothingToAsk`, as the friend's ask is), the agree's ending `joined` writes the `attend` promise (promise-kinds.json) and a yes or a no sets `said-yes` or `said-no`, which the closes read. Lower scene-talk's count in tests/guards/english/line-inserts-baseline.json once the recount lands.

**Time box.** 5 hours, Sonnet at medium effort.

**Rules.** No hand-written player text: every line is a bank piece placed by a fact the packet sets and none is typed in code. No figure in talk (rule 101). Wire to the world: each fact a line needs is read from the office-day engine's meetings, the views engine or the seats, so a line plays only where its record holds. A friend asks only for what the game can settle now (the Words lead, Nov 15).

**Done when.** In a drawn place, Town, State (seed nobody chose), a second session shares a cause to the player in dev mode with a town meeting posted ahead, presses every reply, and finds the talk names the meeting's body and night, the agree is offered only with `stand-with` and writes the `attend` promise by record id, the promise is kept after the player goes and broken after they stay away, no thank-you follows a no, and every new line is said or out of the bank. The line-inserts count for scene-talk holds or falls once #9757 lands.

**Waits on.** The recount of the line-inserts count (#9757) before the count can fall.

**Files.** data/english/parts/scene-talk.json, data/english/scene-talk-tags.json, data/english/pulled.json, src/director/cause-invite-facts.ts, src/director/purpose-scene.ts, src/director/scheduling.ts, src/director/data/promise-kinds.json, src/director/join-cause-paths.test.ts, scripts/words/join-cause-walk.ts

**Notes.**

- 2026-11-17 (Story lead): drafted with a Sonnet writer. See the pull request for the counts, the played talks and the lines for the lead to sign.
- Not built: `action-when` (the public-action record keeps no date for a rally or a meeting), `group` (no record names the action's group; the recruiter speaks as "we"), `sitting-that-night` (20 drawn places, two with no local body, none gave a sitting member with another body meeting the same evening; its 3 lines came out, the read was removed), `item` lines (no drawn place had a posted meeting with a bill first on its agenda), `heard-you` (the fact waits on the town hall's record: nothing says the recruiter was at the player's town hall, so its two kept lines came out, text kept in this PR's history: "Do you remember me? From the town hall?" and "{name} was at the back of your town hall. Now {name} is at your office door with a clipboard about {cause}.") and the recruiter's `tell` and `offer` openings (the arc's state is `request`; an arc change, not a line).
