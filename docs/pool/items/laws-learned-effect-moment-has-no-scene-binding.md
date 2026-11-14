---
id: laws-learned-effect-moment-has-no-scene-binding
title: "A person who learns what a law changed gets a journal moment but no scene, so the law's chain from bill to scene never completes"
area: laws
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Account lead F1, Nov 14, 2026, from the new laws-end-to-end test (the laws-end-to-end-proof pull request) failing in drawn places"
model: opus
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** After a player's price law passes and takes effect, residents who learn what it did (`law.effect-learned`) should each have a director moment with a scene binding, so the scene and the journal line tell it. In played worlds most do not. Seen: in the journal and in the scenes of the residents around the player, after the player's price law takes effect.

**Cause.** Measured: on the account's train branch (head 9c96003b595a3aba4c871e08b314cf443da2b6ed plus the laws-end-to-end test), Williamston, Michigan (2687420, world seed 3887d1f8966e703e7c197149970d6097a4b5b0e703d51ed4ff248a640beaa4a2), law `law:place:2687420:city:us-policy-positions:transportation-infrastructure.fare-free-transit:general:2025-03-06:2025-2`, run to 2026-01-20: 4 people learned it and none had a whole chain. The held-back list read: "person_3454e391200ce5e4's moment has no bindings; person_2441afe39ca2b6ac's moment has no bindings; person_10e3d9def985686e's moment has no bindings; person_305241bbf5aac4e1's moment has no bindings; person_021e52ebb72c098b lacks director moment; person_0a2afa6de2f9a833's moment has no bindings; person_0dc410e8ce11316f's moment has no bindings; person_1423bb97d0f98fa7's moment has no bindings". In code, a moment with `bindings: []` is what src/director/ledger.ts (line 581) writes for a `journal-line` outcome, and src/director/scheduling.ts (line 1015) filters the wanted bindings. Not yet found: which of those two paths gives a learned law effect no scene. The same test also fails on clean main at South Gorin, Missouri (2968870, world seed fe7aec1a07de34615464949e70c74c7eb8960d5287fa3e1860ee9234ce3554b2, run seed 4cce657b2f244345cd9c6f138b4fa42d): "nobody followed learned law:place:2968870:city:...fare-free-transit...2025-03-06:2025-2 by 2026-01-26", with no reason printed there.

**Fix.** Find why a learned law effect's moment is scheduled as a journal line with no binding (scheduling.ts line 1015, the situation type's casting for `law.effect-learned`), and give it a binding where a scene can be cast, or state in the item why the effect is a journal line only and change the laws-end-to-end test to assert that.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what is found, set the state honestly with a one-line note, and stop.

**Rules.** Ask why (owner, Oct 14): the scene and the journal line cite the learned record by id, so a scene that cites nothing is a defect. The scene is a view of the same record (owner, Oct 28).

**Done when.** A second session, not the builder, runs `src/core2/laws-end-to-end.test.ts` on main in a drawn place and sees the chain complete (a learned person with a scene line and a journal line citing the learned record), then plays the same place in dev mode and sees the scene for that person.

**Waits on.** Nothing.

**Files.** src/director/scheduling.ts, src/director/ledger.ts, src/director/scene.ts, src/core2/laws-end-to-end.test.ts
