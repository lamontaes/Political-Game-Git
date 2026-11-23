---
id: director-accusation-packet-reads-the-crime
title: "An accusation's packet says what the player is accused of, from the crime and the complaint"
area: director
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: story
model: opus
effort: medium
root: none
source: Story lead, Nov 19, from the bank 6a-3 writer's probe (claude/story-lines-home-bank6a-3)
checked:
---

**What.** When someone accuses the player of a crime in front of others (`accusation`, purpose `conflict-accuse`), the scene stages from `justice.accused`, but its packet carries only names, the time of day and the variant flags. No line can say what the accusation is about: the bribe, the contract or bill it was for, or who offered and who took it. Seen: the morning a complaint names the player.

**Cause.** Found in code: `composeBinding` in src/director/purpose-scene.ts has no `justice.accused` block. The crime row holds `subjectId`, `amountMinor`, `taken`, `offererId` and `officialId`, and the complaint holds `basis`. The `contract` and `wanted` slots are set only by `bribeReads` for `bribe-offer` and `bribe-pressed`. In the writer's probe at Crescent Lake, OR (place 4116800, seed `b5a867a8…`), the witness variant's packet held `name`, `first`, `place`, the time flags, `read-complaint` and `read-witnessed`.

**Fix.** Add a `justice.accused` block that reads the complaint and the crime row. It sets the subject (the contract or bill, worded as `bribeReads` words it), whether the accuser was the one offered, and whether the player is the offerer or the official, each cited. Then the Story session writes each variant's tree (witness, hearsay, taken, friend) under its own purpose. The `it.fails` marks under story-lines-office-press-and-pressure come off as they compose.

**Time box.** 3 hours.

**Rules.** Ask why: every fact cites the complaint or the crime row. No dice: the scene stages only from the records. The player says only what they chose, and no reply promises an act no ending records (`promise-endings.json` has no `conflict-accuse` row).

**Done when.** A second session, in a drawn place and seed in the running game (dev mode allowed), stages an accusation from a complaint and reads in its packet what the player is accused of, cited by record id; `accusation-variants.test.ts` passes with its mark off.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, data/english/parts/scene-talk.json, src/director/accusation-variants.test.ts

**Notes.** Nov 19 (Story): filed from the writer's probe; 8 narration rows for betrayal and accusation wait on claude/story-lines-home-bank6a-3.
