---
id: words-greeting-opener-not-a-whole-greeting
title: "A talk opens with one greeting: a whole greeting is never the opener of a composed one"
area: words
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/greet-one-turn
pr: #9626
after:
blocked-on:
lead: words
model: sonnet
effort: low
root: none
source: Words lead, Nov 16 (every talk in played-said-aloud-596dfad5 opens with two greetings in a row)
claimed-at:
checked: words builder A 2026-11-16
---

**What.** A talk opens with two greetings from the same person: "Good to see you." then "Funny running into you, David."; "Hello there." then "There you are, Joseph."; "Hi there." then "Twice in two days. I saw you yesterday." The second greeting repeats the first. Seen: a face-to-face talk opens with one greeting, a short hello then the rest, never a whole greeting then a second greeting.

**Cause.** Found in code: a composed greeting is an opener then a core (data/english/parts/conversation.json, piece greet-open), and `openConversation` says the opener as its own turn (src/director/conversation.ts, the block commented "The hello is its own short turn", from #8822, Nov 11). Three pieces that are whole greetings carried the `greet-opener` use: "Good to see you.", "Hello there." and "Hi there.", so they played before a core that greets again.

**Fix.** "Hello there." and "Hi there." lose the `greet-opener` use and keep their plain greeting use; "Good to see you." had no other use, so it becomes a plain greeting (the same use as the other hellos, still needing the player's name known) and loses its opener piece mark. The openers left are "Hello.", "Hi." and "Hey.". No line deleted and none added; the engine and the call split are unchanged.

**Time box.** 1 hour for one Sonnet session at low effort.

**Rules.** No new line. Pinned place and seed. The Words lead reads the played openings at the exact head. Dev mode shows which step and parts chose each opening line through the "Why these lines" panel when it folds, or words-dev-mode-shows-why-a-talk-opened.

**Done when.** At Sheridan WY, seed 7, no talk after a day or after forty days opens with "Good to see you.", "Hello there." or "Hi there." followed by a second greeting (src/director/greet-one-greeting.test.ts, red on the unfixed bank, green after), and three face-to-face openings are in the played file at the head. A second session (not the builder) opens talks with people it has met before at a drawn place from all 56 (place and seed named) and reads one greeting in each.

**Waits on.** Nothing.

**Files.** data/english/parts/conversation.json, src/director/greet-one-greeting.test.ts, scripts/words/greet-openings-replay.ts

**Seen:** a person you have met before opens a talk with one greeting, not two.
