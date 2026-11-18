---
id: story-lines-vote-ask-and-confirm
title: "The colleague's ask for a vote, the player's ask, the sponsor's second try and the family's filing talk compose whole again"
area: words
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/story-lines-vote-ask
pr: 10131
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: Story, Nov 18, on #10063: five cases of src/director/scene-talk.test.ts fail at the cut's head because the vote-ask scenes' lines were partly cut; patterns A42 and C03 (docs/story/scene-patterns.json)
checked:
---

**What.** In office, a colleague asks the player for a vote, the player asks a colleague, a sponsor asks again after an override fails, and at home the family talks over the filing. After the cut these scenes end with nothing from the asker after an agree, a refusal or a bargain, a stall has no words, and the tree is one level deep. Seen: the vote ask before a roll call and the family's talk after the player files.

**Cause.** Measured: on the cut's head (`claude/story-cut-before-nov15`, 356404796b) `src/director/scene-talk.test.ts` fails five cases (`npx vitest run src/director/scene-talk.test.ts`, fixture seed scene-talk-test): `vote-asked` composes no follow after the player's reply, `vote-sought` is skipped because its only stall rows needed `ask-day`, `their-bill` or `asked-before`, `vote-confirmed` builds a one-level tree, no reply ends in `will-look`, and no reply has two follows. The rows that answered them were written before Nov 15 and deleted.

**Fix.** Rows in `data/english/parts/scene-talk.json` for `ask-vote`, `confirm-vote` and `family-filing`: the asker's follows and closes after each reply, stall wordings that need only the bill, the accept after a stall that ends in `will-look`, the caught-lie chain, and the relent and leave after a plea or press, each naming the bill, the section or the office.

**Time box.** 2 hours.

**Rules.** No hand-written player text in code; words come from the banks. Every line names what its record holds (owner, Nov 11).

**Done when.** `src/director/scene-talk.test.ts` passes 11 of 11 on the cut's lines without an edit to the test; every new reply pair has a fresh reader's verdict; a second session, in a drawn place with the player seated on a body, plays the vote ask before a roll call and the reply names the bill.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json

**Notes.** Nov 18 (Story): written by a Sonnet helper; five family lines reworded by the lead where the office slot read as a bare title; 231 pairs judged by a fresh reader, every plant caught.
