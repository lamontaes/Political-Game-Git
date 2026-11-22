---
id: story-lines-home-talk
title: "At home, the household talks about your day, the rent coming due, the government's news and a lost job"
area: words
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/story-lines-home-talk
pr: 10063
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: CTO, Nov 19 00:38Z on the Story thread (issue 9750): the before-office lines the cut needs (the home talk's player-day rows) get written now
checked:
---

**What.** After the cut of Nov 17, a housemate with something new on record had nothing to say about it. Over two weeks at home, 68 days were silent: the player's own day (school, a shift, filing), the rent coming due, the government's news, a relative's lost job. These are the evenings of the golden path before office. Seen: the evening talk at home, every day of a new life.

**Cause.** Measured: on the cut (#10063, head 9dca174b44), `src/director/home-talk-fortnight.test.ts` reported 68 entries "has new on record (player-day) and no talk" across five drawn places, shown by `npx vitest run src/director/home-talk-fortnight.test.ts`. The conversation bank had no rows for those subjects. The lost-job subject also carried no weight (`jobLost` in src/director/conversation.ts), so the talk opened elsewhere.

**Fix.** Write the subjects in `data/english/parts/conversation.json`: for each, the raise, four stances and the answer back, naming the fact each line is about. Give the lost-job subject its weight from the loss's impact, as the player-news subject does.

**Time box.** 3 hours.

**Rules.** No hand-written player text in code: every line is a bank row naming a fact from the record. People say how it feels, never the figure: the rent and the pay are never said aloud. The player says only what they chose.

**Done when.** A second session, in a drawn place and seed in the running game, lives two weeks at home and hears the household talk about the player's day, the rent, the news and a lost job, each from its record; `home-talk-fortnight.test.ts` reports no "has new on record ... and no talk" entry.

**Waits on.** Nothing.

**Files.** data/english/parts/conversation.json, src/director/conversation.ts

**Notes.** Nov 19 (Story): a Sonnet helper wrote 285 rows over six seeds and about 30 drawn places. The "no talk at home in two weeks" entries that remain are red on the train too. `job-lost-talk-played.test.ts` is red on the train at Charlotte Amalie West and Hotevilla-Bacavi; Afono, American Samoa, which the cut had turned red, passes. Some rent lines claim a household history no record holds ("We've always found the rent"); that is for the Words lead.
