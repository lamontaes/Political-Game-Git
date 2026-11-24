---
id: words-home-talks-rewritten
title: "Home talks say something: news answers with an opinion, household goodbyes and acknowledgments, and the content-free news openers removed"
area: words
kind: feature
priority: 1
size: S
status: done
claimed-by: words-and-scenes lead
pr: #6276
blocked-on:
source: "owner sitting Oct 26 (the home talks said nothing); deliverable 7 of docs/work-orders/lead-words-scenes-2026-10-26.md"
lead: words
milestone: play-first
claimed-at: 2026-10-27
---

**What.** On Oct 26 the owner heard home talks that said nothing: "Guess what." followed by nothing, the same goodbyes a stranger uses, and replies with no view. This item rewrites the conversation bank's home-talk pieces that the director can already play. Pieces that need new facts from the director wait on `scene-household-news-says-the-story` and `scene-household-quiet-day-talk`.

**Rules.** Serves `scene-standard`: lines vary by speaker and tie to the player, never a stranger's goodbye at home. No hand-written player text in code: every new line is a bank piece the English engine composes. Every bank piece plays (owner, Oct 24): a piece ships only when a packet the director builds today can render it.

**Done when.**

- The six news openers that name nothing ("Guess what.", "Did you hear?" and four more) are deleted. The openers that remain name the topic.
- Six news answers give a clear view (for, against, waiting to learn more, what it means for us).
- Three housemate goodbyes sit on the director's `home` stage, and three plain acknowledgments carry no stage.
- In a drawn place (buildBenchWorld, seed printed), a test renders each new piece's move from a packet the director builds, and `english-parts-banks` passes.

**Time box.** 2 hours.

**You will see.** At home, a housemate who heard the news says what they think of it, and leaves the talk with "Glad we talked." rather than "Have a nice day."

**Screenshot.** The talk box at home with a housemate, from a drawn place, in the PR body.

**Files.** data/english/parts/conversation.json

**Episode.** A candidate tells the household at the kitchen table that they mean to run (from a local officeholder's memoir; calibration only, no name ships).

**Notes.** The pieces that wait on the director (news raised by headline and outlet, evening goodbyes, the quiet-day opener and replies) are drafted on branch `words/home-talk-lines` at e356f24e71.
