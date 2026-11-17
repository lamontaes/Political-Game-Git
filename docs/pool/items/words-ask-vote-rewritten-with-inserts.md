---
id: words-ask-vote-rewritten-with-inserts
title: "A colleague's ask for a vote says what the records hold: where you stand, how short the count is, how you voted on their last bill, and a thank never follows a no"
area: words
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: rc4-hand-written-words
lead: words
model: opus
effort: medium
source: owner, Nov 16, "No. Count them again and rewrite them with inserts", "either that or remove them and start fresh"; Story lead's spec of Nov 17 (the ask-vote rewrite)
---

**What.** The ask for a vote held 341 uses under `ask-vote` and its variants, 210 placed by nothing: a greet with nothing behind it, "Alright. We have a deal." after the player refused, a thank that could follow a no, and a player's yes that never said why. The ask now leans on what the records hold and the player's answer gives a reason.
Seen: the evening before a floor vote in a drawn place, the colleague asks; the player's yes names where they stand on the bill's question, the colleague's press says whether the player is the one name left or one on a list, and no thank follows a refusal.

**Cause.** Found in code: the ask-vote routine set in data/english/parts/scene-talk.json carried no `requiresFacts`, `excludesFacts` or `onlyWhen` (follow/accept 12, follow/thank 7, greet 8, the closes and most replies), and `composeBinding` in src/director/purpose-scene.ts set no fact for the asked member's stand on the bill, the sponsor's count or the member's vote on the sponsor's last bill, so no line could be placed by them; a follow/accept with no `after` played both after a refusal and after a deal.

**Fix.** Add `voteAskFacts` in src/director/vote-ask-facts.ts, called from `composeBinding` for a `vote-ahead` record: `about` and `stand` or `stand-against` (the views engine through bill-question-facts.ts, shared with donor-ask-facts.ts), `count-one` or `count-several` (the record's `asked` list), and `voted-with-before` or `voted-against-before` (the member's vote record and that bill's roll call). Delete the uses the spec lists, place the base openers by `bill`, write the families against the facts, and set `said-yes`/`said-no` on the replies so the thanks need a yes and the closes that take a no leave it out.

**Time box.** 5 hours, Opus at medium effort.

**Rules.** No hand-written player text: every line is a bank piece placed by a fact the packet sets. Wire to the world: each new fact is read from the views engine, the legislature's vote-ahead record or the record module's votes, so a line plays only where its record holds. No figure is spoken: the count is words.

**Done when.** In a drawn place, Town, State (seed nobody chose), a second session seats the player on a body in dev mode, plays to the evening before a colleague's short bill, presses every reply of the colleague's ask and of the player's own ask, and finds the player's yes names their stand by record id, no thank follows a no, and every new line is said or out of the bank. The line-inserts count for scene-talk holds or falls once #9757 lands.

**Waits on.** The recount of the line-inserts count (#9757) before the count can fall.

**Files.** data/english/parts/scene-talk.json, data/english/pulled.json, src/director/vote-ask-facts.ts, src/director/bill-question-facts.ts, src/director/donor-ask-facts.ts, src/director/purpose-scene.ts, src/director/arc-variant.ts, src/director/ask-vote-paths.test.ts, scripts/words/ask-vote-walk.ts

**Notes.**

- 2026-11-17 (Story lead): drafted by an Opus builder. See the pull request for the counts, the played talks and the lines for the lead to sign.
