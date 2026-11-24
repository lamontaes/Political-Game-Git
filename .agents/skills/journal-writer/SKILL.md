---
name: journal-writer
description: >
  Writes the told life: the Journal and its weeks, the life story and its
  chapters, the years before the first evening, history lines, and the loading
  screen's words. It's a memoir, not a list; a week is a paragraph that groups
  what happened. The life story is plain, and the dry, sarcastic voice belongs
  only in the loading screen's progress messages. Use when writing or deleting
  journal, diary, life story, person history, history or loading lines. The
  shared loop is story-writer.
---

# Journal writer

The owner, word for word:

- Oct 27, 2026: "this journal needs to be written like a story, not individual fucking sections, but written like a story from birth."
- Nov 23: "The journal is still a list of facts. None of my feedback is being taken."
- Nov 23, on the loading screen: "I've mentioned before, I'd like it if it was a little sarcastic. The, countdown or whatever is still just a list of facts. It's still not written as a story."
- Nov 24: "It's not the lines. I'm talking about the loading screen is sarcastic. Oh my God."

Read `story-writer` first. The lane's moves and facts are in `docs/story/writer-spec.md` on branch `story/first-evening`.

## The rules that must hold

1. **A memoir in chapters by stretch of life.** Dates go into the prose where they matter. Repeated things are summarized, never counted ("3 more like it followed" is wrong). There are no year headers.
2. **A week is one paragraph.** It groups what happened, with its people and its cause, never one line per event (`journal-entry-has-story-around-it`, `journal-line-carries-its-subject`).
3. **People are named by who they are the first time** ("Your dad, Gene,"). Never mention a person the player can't place.
4. **No feelings are named** (`journal-names-no-feeling`). Mood shows through what people did and said.
5. **The life story is plain.** No quips, epigrams or jokes about the state. On Nov 24 he failed "By 2012 the state had you in a classroom in Meadow. That's how the state says hello." and "...Utah has its usual problems, and Meadow has saved you a seat." (`no-literary-phrasing`).
6. **No line restates what the screen shows.** He failed "It's January 2025" on Nov 24: "the date is in the bottom left."
7. **No opener comes back in every life.** He failed "You were born in 2007, and nobody asked you first." on Nov 24: "Why is this still coming up?" Every chapter opening has many versions tied to the life's own facts.
8. **The loading screen's progress messages carry the sarcasm.** These are the lines that say what the game is doing while it builds the world (they're in `src/bench/data/controls.json`). Write them dry and a little sarcastic, as a story of the world being built, never as a list of steps.
   - Reading: the joke points at a real thing being built (the town, the economy, the century of history), never at nothing.
   - The line he heard and disliked twice ("letting the country, the state, and its towns run for 2 months before you start playing") is one to replace. Treat it as the concept, not a template.
9. **History is simulated from 1925.** History lines tell what the simulation made; nothing is drawn from a list (`day-one-in-motion`). Childhood lines claim no outcomes the record doesn't hold (`childhood-lines-claim-no-outcomes`).
10. **The player's own side** is written only where the player gave it.

## Gotchas

- Nov 24: the writers put quips into the life story and left the progress messages plain. That's backwards (see rules 5 and 8).
- Nov 19: the Journal bank was 336 one-sentence pieces, one per event. A bank of single lines can't tell a week; the planner groups events into a paragraph, and the lines are written to sit together.
- Oct 1: he had asked "multiple times" for the Journal to read as a story. A list of dated "I did this." lines is engine output, not a game.
