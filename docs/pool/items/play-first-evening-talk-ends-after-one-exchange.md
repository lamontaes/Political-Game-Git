---
id: play-first-evening-talk-ends-after-one-exchange
title: "The first evening's talk at home ends after one exchange"
area: play
kind: bug
priority: 1
size: S
status: merged
standard: 2
claimed-by: claude/first-evening-talk-ends-early
pr: #8893
after:
blocked-on:
lead: words
model: sonnet
effort: low
root: rc4-hand-written-words
source: found by fixer F2 on #8427; cause found by an Opus fixer, Nov 12
branch: claude/first-evening-talk-ends-early
merged-at: 2026-11-12T18:04:24.394Z
---

**What.** On the first evening at home, a relative raises a point of the President's address, the player answers, the relative answers back and then says goodbye ("Go on and enjoy what's left of tonight."). The talk is one exchange in every place tried, so the owner's first talk in a new life closes on him as soon as he answers. Seen: the first evening's talk box offers a second set of replies after the relative answers the player's reply on the address.

**Cause.** Found in code: src/director/conversation.ts, function carryOn, reads `related` in src/director/data/conversation-rules.json by the main topic's kind; the first evening's topic is the address's point (`address-point`, made in #8736), which has no `related` row, so carryOn ends the talk after the relative's answer. Measured on main 9148995fc6 in Pocahontas, Virginia (seed b64c2e05-c101-41d6-b41e-3948de980d9a), Clifton, West Virginia (seed 51288270-ec9a-40ed-bf81-6965abe2497e), Oakland, Arkansas (seed f0a8c079-fe7b-4b96-bbd3-0635ccad25b3) and Shelby, Iowa (seed bccd953a-e564-4f08-ac8c-7d7ca24d9e69).

**Fix.** Add the row `"address-point": ["news", "own-view"]` to `related`: after the point, the relative goes on to news they heard, else to where they stand. The old `address` topic led to news; `own-view` is what the first evening holds, since no news has reached anyone yet.

**Time box.** 1 hour for one Sonnet session.

**Rules.** A good exchange keeps going (OWNER-DECISIONS.md: "A yes or no never ends a talk; the asker follows up"). No hand-written player text in code: no line under data/english/parts changes, and the second exchange is composed from the banks that already play. One rule, all 56 places: the test draws its places and names them with their seeds, never in logic.

**Done when.** A second session starts a new life on main in a drawn place, talks to a relative in the first evening's room, picks a reply, and after the relative's answer gets a second set of replies instead of a goodbye; src/bench/first-evening-talk-goes-on.test.ts passes on a fresh draw.

**Waits on.** Nothing.

**Files.** src/director/data/conversation-rules.json, src/bench/first-evening-talk-goes-on.test.ts (new)

**Notes.** Unblocks #8427 (tests-talk-history-one-exchange), whose browser check needs two exchanges in that talk.
