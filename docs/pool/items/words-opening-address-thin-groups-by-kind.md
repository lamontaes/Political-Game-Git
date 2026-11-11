---
id: words-opening-address-thin-groups-by-kind
title: "The President's address has at least three versions a voice of every line, in every kind of address"
area: words
kind: bug
priority: 2
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: rc4-hand-written-words
source: Words builder W8's address-versions runs, Nov 11, 2026 (seeds w8v-09, w8v-13, w8v-30), with Fable B's ruling of 16:01Z
checked:
claimed-at:
branch:
---

**What.** In ten drawn new lives, the President's address says the same whole sentence in three of them. Seed w8v-30: "I take this oath as a promise to build on wage growth and to fix what still falls short, one task at a time." in Volcano Golf Course, Hawaii; Gaylord, Kansas; and Robesonia, Pennsylvania. The owner, Nov 11, 2026, wants "a ton of different speech versions a ton of different inserts". Seen: the talk box of the first screen of a new life.

**Cause.** Measured: `OPENING_VERSIONS_SEED=w8v-30 npx vitest run src/director/opening-address-versions.test.ts` (Volcano Golf Course, Hawaii, seed w8v-30:0), and the groups counted in `data/english/parts/opening-speech.json`: an address is joined from one core per move, chosen within a group (move × address kind × voice × topic × required facts). After the policy kind was brought to three versions a voice (#8838), 345 of the 678 core groups still hold fewer than three: hopeful 20 groups, crisis 42, combative 55, victory 65, mourning 52, and 111 groups shared by every kind (the country's story and the pledges by topic). And every world shares one national economy, so the inserts `{best}` and `{hardest}` come out the same ("wage growth", "sticker shock"): three worlds that land on the same kind and voice say the same line about one time in four.

**Fix.**

1. **Bring every thin group to three versions a voice: about 520 lines** (hopeful 27, crisis 65, combative 83, victory 97, mourning 83, shared 165). Each one is a new core in its group, copied from a sibling's fields, carrying that group's insert in braces; at least a third of each group twelve words or fewer (`english-opening-speech.test.ts`); no figure; no line the owner turned down.
2. **Work one kind at a time**, the kinds a new life opens on most first. Each kind is its own pull request.
3. **Run `npm run words:rules` twice** after each kind, and the bank tests and `tests/guards/english`.

**Time box.** 3 hours a kind for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code: every line is in the bank. Every line carries an insert read from the world. Real speech: short, plain American English in each voice. Skills `civic-prose`, `scene-standard`, `words-engine`.

**Done when.** `src/director/opening-address-versions.test.ts` names no thin group it passed over in ten fresh seeds in a row, which its output lists, and a second session, in the running game on main at 1440x900, starts three new lives in drawn places it names with their seeds and reads three different addresses.

**Waits on.** #8838 (the policy kind, and the test's list of thin groups it passes over).

**Files.** data/english/parts/opening-speech.json, src/director/opening-address-versions.test.ts

**Notes.** Fable B, Nov 11, 16:01Z: the policy kind now, because it is the address every new life opens on, and "do not write the other ~360 this week". The count here is by topic as well, which is why it comes to about 520.
