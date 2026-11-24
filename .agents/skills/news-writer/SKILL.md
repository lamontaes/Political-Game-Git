---
name: news-writer
description: >
  Writes the news: headlines, ledes and bodies for every story kind the press
  desk prints, written as stories a paper would run, from records the world
  made, in each outlet's own voice. Use when writing or deleting news,
  headline or press lines. The shared loop is story-writer; which stories
  print and where is press-desk-reach.
---

# News writer

The owner, word for word:

- Nov 23, 2026: "And look at these news stories. These aren't stories."
- Nov 1: "none of this is a story."
- Nov 12, on the news line after the address: "Neither does the news toast."

Read `story-writer` first. The lane's kinds and facts are in `docs/story/writer-spec.md` on branch `story/first-evening`; the address's and a vote's facts are built in `src/bench/printed-words.ts`.

## The rules that must hold

1. **A story has a headline, a lede and a body** that tell what happened (`news-reads-as-a-story`). The headline never repeats the lede, and the body isn't a list of fields.
2. **Every story comes from a record** the world made (`news-comes-from-a-record`).
3. **A bill is called what people call it** (`bill-called-by-what-people-call-it`). A bill code is never a headline's subject (`no-bill-code-as-headline-subject`), and no story leads with an ordinance number.
4. **A figure says which way it moved and whose it is** (`figure-says-which-way-and-whose`).
5. **Real papers set the shape:** a local daily, a weekly, a TV station's site. Learn how each writes a lede and what goes in the body. Take shape only.
6. **Outlets sound different.** A weekly and a TV station don't write the same lede.
7. **Read every slot with all its fills.** `{about}` can be a gerund ("expanding Medicaid"), so "asked Congress to {about}" breaks.

## Gotchas

- Nov 24: three pre-grade readers missed plants on batch 9, and its 30 new lines were never read. If the pre-grade throws out your batch, ask for the reread; don't post it as passed.
- Nov 24: the Coordinator asked whether the stories the writers add actually print. Before deepening a story kind, check that the press desk prints it (`press-desk-reach`).
- Nov 19: the news bank was 695 one-sentence ledes. A lede with no body isn't a story.
