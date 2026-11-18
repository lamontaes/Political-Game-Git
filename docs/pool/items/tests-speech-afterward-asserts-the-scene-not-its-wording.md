---
id: tests-speech-afterward-asserts-the-scene-not-its-wording
title: "The speech-afterward test asserts who comes over and why, not the sentence the narration happens to use"
area: director
kind: cleanup
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: low
root: design-words-machine
source: Account lead, Nov 14 2026 (coordinator's ruling: the test is at fault, not the line)
claimed-at:
checked: account-lead 2026-11-14
branch:
---

**What.** `src/director/speech-afterward.test.ts` (removed) checks that a campaign speech that moves a listener brings the candidate over, but its last assertion matches the narration against the words /room empties|candidate who spoke/i. When the Words lead rewords the line the test goes red with nothing wrong in the game. At its seed ecd28aa5c524d71bea0b3b25208b3f7a3e316826 (second place drawn, Atglen, Pennsylvania, world seed dc1669a95af79894633c68866bad185bd09093b8058563d7d80dab2035f99b01) the scene reads "First thing on October 12th, you head out, and Patrick Gallegos comes over. Patrick, whose speech you heard, is coming your way." and the test fails on it. Seen: the test passes after any rewording of the line while the scene still stages the right person.

**Cause.** Found in code: `docs/current.json` holds the replaced row for the test, deleted on #10063; as it stood, the assertion at `src/director/speech-afterward.test.ts` (removed) line 189 (`expect(narration, said).toMatch(/room empties|candidate who spoke/i)`) pins one wording, and the test draws its seed from `randomBytes` unless `GOLDEN_PATH_SEED` is set, so a reword shows up red by the draw. The scene's cause is already asserted on the line above (`result.scene.cause.id` equals the moment's cause), so the wording check adds nothing the records do not say.

**Fix.** Assert the scene, not the sentence: the person who comes over is the speaker of the heard speech (the `views:speaker` fact on the speech's record, the cause the moment names), and the narration names that person by piece key from the English engine's bank rather than by wording. Pin the seed in the test file to ecd28aa5c524d71bea0b3b25208b3f7a3e316826 (with the env override kept) once the test is green on it, as its own commit. Do not loosen what the test checks.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the test reads the bank's piece key and the record's fact, never a sentence typed in the test. One rule, all 56 places: no place is named in logic; the test pins a named place and seed. Ask why: every assertion names its record id.

**Done when.** A second session runs the test at the seed above in a drawn place's world and it passes; rewording the narration line in its bank leaves it green; and a staged wrong person (the candidate of another speech) makes it fail.

**Waits on.** Nothing.

**Files.** `docs/current.json` (the replaced row for the deleted test).

**Notes.** Nov 18 (Story): dropped; the test it would fix was deleted on #10063 with the after-the-speech scene's lines (owner, Nov 17: delete everything the engine did not write). Filed Nov 14 by the Account lead on the coordinator's ruling. The pinned seed first stopped on the campaign overdraw fixed in campaigns-purchases-spend-the-set-aside-funds, then on this assertion.

- Nov 15, civic roles builder: red twice more by draw on the train, same assertion, nothing in either diff touching the scene. At c295b5d2 (test seed 3351d29171f78ff25c6bc15b3d848fb302664d1d): Lordship, Connecticut (0944000), world seed ce9fd247231aac891a4c12f045e6216ef6a2b25a8461f74f5d716169ec160ee9, narration "First thing on November 16th, you mee…". At e12e9cc4 (#9407, test seed ef713fed3e7bc8601e9fd6e775ac8ec2c269a723): Bethel, Vermont (5005725), world seed 41f5be735b636165ea4e24795694b4f374696e41eafe56ffe9b8051ca8c96694, narration "First thing on January 15th, you head…".
