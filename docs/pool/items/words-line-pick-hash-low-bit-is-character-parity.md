---
id: words-line-pick-hash-low-bit-is-character-parity
title: "A line pick between two equal pieces is decided by how many odd letters the key holds, not by the moment"
area: words
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: "Civic roles builder, Nov 15, playing #9417 at 021b1556"
lead: words
standard: 2
root: none
model: sonnet
effort: medium
---

**What.** In the cause invite, two state lines fit equally ("You and I are on the same side on {cause}..." and "A few of us have started working on {cause}. I thought of you first."). Both have weight 1. Across 23 acquaintances at Edgar WI (5522550, edgar-petition-1), Guaynabo PR (7232522) and Denver PA (4218888, cb7367e1), the first line played every time. A logged run showed weights 1 and 1 with `draw 1` on every scene. Seen: in every scene where two lines fit a spot equally well, the same one plays for everyone at a place.

**Cause.** Found in code: `renderGroundedEnglish` (src/english/grounded-english.ts) picks with `BigInt(0x stableHash(...)) % totalWeight`. `stableHash` (src/core2/kernel/ids.ts) is FNV-1a: the code is XORed into the low limb and then multiplied by an odd prime, so the hash's lowest bit is always 1 XOR the parity of the number of characters with an odd code. A check over 2,000 random keys matched that rule 2,000 of 2,000 times. With two variants of equal weight, the pick is that parity alone. The scene's moment key holds the asker's and the player's ids in pairs, so their characters cancel, and the parity stays the same for every asker at a place. For any even total weight, the low bit of the draw is biased the same way. The same `% n` on `stableHash` is used in `wordSceneMove` for joined sentences (src/english/scene-talk-words.ts).

**Fix.** Draw from bits that the whole key mixes into: take the high 32 bits (`BigInt(0x hash) >> 32n`), or put the hash through a 64-bit finalizer (the murmur3 fmix64 step) before `% n`. The player sees it in every scene: lines that fit equally now take turns. Use it at each `stableHash(...) % n` pick in src/english. Seeded picks will change, so any test pinned to a picked wording needs its premise restated (pinned-tests rule).

**Time box.** 2 hours for one Sonnet session.

**Rules.** No dice: the pick stays seeded by the moment, never a roll; only the bits it reads change. Pinned tests: any test pinned to a picked wording states its old premise before it is re-pinned.

**Done when.** A second session, not the builder, plays the cause invite on main for ten of the player's acquaintances in a drawn place (named, with its seed) and sees both acquainted state lines spoken, and a unit test in src/english shows a two-variant pick splitting within 40 to 60 percent over 1,000 keys that differ only in a repeated id pair.

**Waits on.** nothing.

**Files.** src/english/grounded-english.ts, src/english/scene-talk-words.ts, src/core2/kernel/ids.ts

**Notes.** Found while showing the Words lead that "A few of us have started working on {cause}. I thought of you first." plays on #9417. The Words lead ruled the line out of #9417 (Nov 15); M4's pick PR fixes this function, and the line comes back in a follow-up after both fold, replaying the 23 acquaintances.
