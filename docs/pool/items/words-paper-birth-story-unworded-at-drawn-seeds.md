---
id: words-paper-birth-story-unworded-at-drawn-seeds
title: "A birth story the press prints comes out unworded, and two tests draw their seeds"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: words
model: sonnet
effort: medium
root: none
source: found on branch claude/project-thread-aqtryq (gate of #9227, Nov 14)
checked: m3 2026-11-14
---

**What.** The press prints a birth ("person:birth" source record) that the English engine cannot word: `wordPrintedStory` returns null, and src/bench/press-briefs.test.ts and src/bench/printed-words.test.ts fail on it. Both tests draw a random seed each run (`randomBytes` when `GOLDEN_PATH_SEED` is unset), so they are red by draw, which the pinned-tests skill forbids. Seen: News, Briefs, in a town where a birth prints: the birth brief has a headline and a line.

**Cause.** Measured: with `GOLDEN_PATH_SEED=2d805cf4d2aceff57ef3 npx vitest run src/bench/press-briefs.test.ts` (Cavetown, Maryland) the story `printed:outlet:newspaper:0:jurisdiction_ed5d137178b367c7:person_3d5bf95178ff7f1c:birth` is unworded; with `GOLDEN_PATH_SEED=a841494a2ab44f7b8e5d1e3ac07b89b7d5410140 npx vitest run src/bench/printed-words.test.ts` (Crystal Lake, Connecticut) the story `person_b18ec3285e5ebafd:birth` is unworded. The `birth` builder in src/bench/printed-words.ts needs a name and a parent; the first step is to read which of the two is missing for those records (a counted mother or an unnamed child) and why the press printed a birth the builder cannot say.

**More evidence (Nov 14, train head 8bb1ff9d and 8b6c8903).** At Camp Verde, Arizona, seed e124c6c734c6455d7462dce0f0828ae050a5d34b, `src/bench/printed-words.test.ts` (words every story the press prints in a year) leaves 54 stories unworded on the train head without the police-log changes: `cause-group.ad:...:budget-line:naturalResources:<date>` ads and `justice.visiting-access:custody-referral:case:<person>:<date>` stories. Same class: the press prints a story the English engine cannot word, and the test draws its seed.

**Fix.** Find why the builder gets no name or no parent for those two records and make the press print a birth only when it can be worded, or read the missing fact from the record that holds it; pin both tests to named places with seeds in the test file.

**Time box.** 2 hours.

**Rules.** No dice; a counted household's birth is told by count, never by inventing a mother.

**Done when.** In the running game, in a place and seed the builder did not choose (random one of the 56) and again at Cavetown, Maryland (seed 2d805cf4d2aceff57ef3) and Crystal Lake, Connecticut (seed a841494a2ab44f7b8e5d1e3ac07b89b7d5410140), a second session reads News and finds every printed birth worded, and both tests pass at their pinned places.

**Waits on.** Nothing.

**Files.** src/bench/printed-words.ts,src/bench/printed-words.test.ts,src/bench/press-briefs.test.ts
