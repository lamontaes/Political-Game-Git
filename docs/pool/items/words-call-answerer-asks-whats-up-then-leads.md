---
id: words-call-answerer-asks-whats-up-then-leads
title: 'On the player''s call, the person who answers asks "What''s up?" and then goes straight into their own view'
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
source: "Family life thread, Nov 15, 2026, card walk on #9256 at 25195f1b (Homestead, Florida, seed 59e44044-9b6b-41c3-8ab4-eb463c4e49b7)"
model: opus
effort: medium
root: none
---

**What.** The player calls Mary Puckett, a grandmother elsewhere, from the person card on the opening evening. She answers "Hello?", the player says "Hi, it's me.", and she says "Oh, hi. What's up?" and then, with no turn for the player, "I read about more assistance spending last week. I'm for it, myself." She asks the caller why they called and then answers her own question. Seen: the talk box of a Call from the person card.

**Cause.** Found in code: the phone talk opens in `openConversationNow` (src/director/conversation.ts, the greeting block about line 5690): the person answering says the hello, the player says who it is (`GREET_AND_PART.phoneSelf`), and the answerer's greet-core follows, picked from the by-phone parts in data/english/parts/conversation.json (`conversation.greet-core.phone-oh-hi-what-s-up`, `phone-hey-what-s-going-on`, `phone-hey-you-what-s-up`, added in dab1870e29). The talk then goes on as every talk does, with the other person leading a subject. Three of the phone greet-cores are questions that hand the turn to the caller, and the engine never gives it to them.

**Fix.** The phone greet-core that ends in a question is held back by the fact the composition already has when the answerer leads next (every phone talk today), so only the greetings that do not ask are said: add `excludesFacts: ["by-phone"]` to the question variants' phone uses or give the player the turn after "What's up?" with their own subject as replies (the conversation engine's reply step). The Words lead picks which; one engine, no second phone path.

**Time box.** 2 hours, Opus at medium effort. When it runs out, push what passes, set the state honestly and stop.

**Rules.** Ask why: a question a person says is one the talk then lets the other answer (rule 108). One engine per mechanic: the conversation engine's one greeting and reply path, no second phone path.

**Done when.** In a drawn place named with its seed, a call from the card plays no greeting that asks the caller something they are then never let to answer, and a second session sees it in the talk box.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, data/english/parts/conversation.json
