---
id: words-law-story-says-what-it-does
title: "A played law's printed story carries a body that says what the law does"
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
lead: story
source: "CTO, Nov 19, 2026, 11:03Z on #9747 (approving #10276): file the missing one, a played law's printed story carries a body that says what it does; after the reset, lead Story"
model: sonnet
effort: medium
root: none
---

**What.** When a policy law takes effect in play, the paper's story about it can stop at its headline and first line, without the sentence that says what the law does, even where the bill catalog holds the law's purpose. Seen: the News story the day a law takes effect, its second paragraph saying what the law does.

**Cause.** Found in code: the `law` story in `src/english/english-newscast.ts` (line 124) takes its body from the context pieces `law-purpose` and `law-bill`, and `composeNewsStory` prints paragraphs only when one of them fits. On main 79e2a8fd at seed d29164ca43159e0d (Brunswick, Maryland 2436125), the archived story for `us-policy-positions:business-commerce.cap-consumer-loan-rates` has the catalog purpose "a ceiling on interest rates for consumer loans" (`data/english/bill-names.json`) and prints with no body, while 29 other laws there carry one. No test requires a played law's story to have a body: `src/bench/printed-words.test.ts` checks the shape of a body when one is printed, and Ohio's wage change by its lede.

**Fix.** Find why no `law-purpose` piece fits that story (the slots its pieces need, or a rule that drops the purpose once the lede says it) and write or wire the pieces so that a law with a catalog purpose always prints one sentence of what it does after the lede. Add a case to `src/bench/printed-words.test.ts`: in a played year at a drawn place, every printed story of a policy law taking effect whose series has a catalog purpose has a body, and the body's second paragraph is not the lede.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The lines are Story's alone to write (owner, Nov 10). A sentence says only what the record holds. No hand-written player text in code.

**Done when.** A second session plays a drawn place (named, with its seed) in the bench until a law takes effect, opens News, and reads the law's story with a second paragraph saying what the law does; the new case in `printed-words.test.ts` passes and fails on the old pieces.

**Waits on.** Nothing.

**Files.** src/english/english-newscast.ts, src/bench/printed-words.ts, src/bench/printed-words.test.ts, data/english/bill-names.json
