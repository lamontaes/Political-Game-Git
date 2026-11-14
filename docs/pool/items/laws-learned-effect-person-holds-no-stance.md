---
id: laws-learned-effect-person-holds-no-stance
title: "A person who learned what a price law changed holds no stance on the law's question"
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: "Account lead F1, Nov 14, 2026, from the new laws-end-to-end test (the laws-end-to-end-proof pull request) failing in Vancleave, Mississippi"
model: opus
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** A resident who ties a price change to a law they heard of (`law.effect-learned`, written by place-prices `emitLearned`) should then hold a view of the law's question that cites what they learned. In a played world a person who learned it has no such view. Seen: on a resident's People card, in what they think of the law's question.

**Cause.** Measured: on the train branch with the laws-end-to-end test, Vancleave, Mississippi (2876200, world seed 5d6e0ed453d0d73c23cdd300b30d27bbb67519aecbafe8d5eee56c9f68a4148c; run seed 4cce657b2f244345cd9c6f138b4fa42d, label enacted-3), person_1004f5b79550a2ed had a `law.effect-learned` record for the town's fare-free transit law, a law-reach record, a `felt` record and a heard story, and `stancesOf(api, person_1004f5b79550a2ed)` had no row whose topic is the law's question: "person_1004f5b79550a2ed holds no stance: expected undefined to be defined". Not yet found: whether the views engine drops the stance for this person (views.ts reads `law.effect-learned`, see src/core2/modules/views.ts) or the topic key differs from the question's. The learned event is `event:law.effect-learned:<date>:<person>:<law>` with `topic` set to the policy key (place-prices.ts, line 735).

**Fix.** Print the person's stance rows and the learned event's `topic` in a played Vancleave, find which side differs (the key the stance is stored under against the key the test reads), and fix the owner of the mismatch. If the stance is rightly absent for a person who has not grounded a view, say so and change the test's assertion to the people it applies to.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, push what is found, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: a stance cites the learned record (owner, Oct 14). An effect is a read: the views engine reads the learned event. No dice.

**Done when.** A second session, not the builder, replays Vancleave, Mississippi (2876200, the world seed above) as a drawn place on main with the laws-end-to-end test and sees person_1004f5b79550a2ed with a stance on the law's question that cites the learned record, or the item states why none is right and the test no longer asserts one.

**Waits on.** Nothing.

**Files.** src/core2/modules/views.ts, src/core2/modules/place-prices.ts, src/core2/laws-end-to-end.test.ts
