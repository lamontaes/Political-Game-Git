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
- Nov 24, grading page 1: "I would say something like 2025 was my first election. I vividly remember watching President Cunningham's speech together ... At the time, you know, I didn't pay that much attention."
- Nov 24, grading page 1, on loading: "Printing money. Printing more money. Printing even more money. Like, those could pop up consecutively ... These need to be short."

Read `story-writer` first, and your area's part of its `references/his-words.md`: what he already said, so you don't start from scratch. The lane's moves and facts are in `docs/story/writer-spec.md` on branch `story/first-evening`.

## The rules that must hold

1. **Told looking back.** The Journal is written from later in the life, about what happened then: "2025 was my first election. I vividly remember…", "At the time, I didn't pay much attention." (owner, Nov 24).
2. **Later life rewrites earlier entries.** Owner, Nov 24: "if in 30 years you become a huge healthcare guy, then the journal entry could update. Little did I know how much this speech would drive the next 50 years." Write entries with versions that read records made after them. An entry with no later records reads as it happened. The engine piece that lets an entry read later records is an engine item, not lines.
3. **A memoir in chapters by stretch of life.** Dates go into the prose where they matter. Repeated things are summarized, never counted ("3 more like it followed" is wrong). There are no year headers.
4. **A week is one paragraph.** It groups what happened, with its people and its cause, never one line per event (`journal-entry-has-story-around-it`, `journal-line-carries-its-subject`).
5. **People are named by who they are the first time** ("Your dad, Gene,"). Never mention a person the player can't place.
6. **No feelings are named** (`journal-names-no-feeling`). Mood shows through what people did and said.
7. **The life story is plain.** No quips, epigrams or jokes about the state. On Nov 24 he failed "By 2012 the state had you in a classroom in Meadow. That's how the state says hello." and "...Utah has its usual problems, and Meadow has saved you a seat." (`no-literary-phrasing`).
8. **No line restates what the screen shows.** He failed "It's January 2025" on Nov 24: "the date is in the bottom left."
9. **No opener comes back in every life.** He failed "You were born in 2007, and nobody asked you first." on Nov 24: "Why is this still coming up?" Every chapter opening has many versions tied to the life's own facts.
10. **The loading screen's progress messages carry the sarcasm.** These are the lines that say what the game is doing while it builds the world (they're in `src/bench/data/controls.json`).
    - **Short.** One short phrase per step (owner, Nov 24: "These need to be short.").
    - **Dry and sarcastic about something the game really builds.** His kind, as concepts: handing out government contracts, buying data from data brokers (point at the game's "a consumer data privacy law"), fudging some numbers, writing the history books, checking the ballot boxes one more time, bribing Congress, falling behind.
    - **Escalating series:** a step can come back in the next steps, rising each time ("Printing money", "Printing more money", "Printing even more money").
    - **Mix in plain steps.** He likes "Appointing the cabinet".
    - **Never developer talk.** He named it on Nov 24: "Wiring Greeley to the rest of Colorado, so one thing can affect another", "Everyone has a desk and a view on the desk", "Letting the country, the state and the town run two months on their own", "Greeley is running without you, and it will remind you of that". None of those come back.
11. **History is simulated from 1925.** History lines tell what the simulation made; nothing is drawn from a list (`day-one-in-motion`). Childhood lines claim no outcomes the record doesn't hold (`childhood-lines-claim-no-outcomes`).
12. **The player's own side** is written only where the player gave it.

## Gotchas

- Nov 24, morning: the writers put quips into the life story and left the progress messages plain. That's backwards. The life story is plain, and the progress messages are sarcastic.
- Nov 24, afternoon: the first sarcastic steps were long sentences that explained the engine ("so one thing can affect another"). He wants short jokes about what's being built.
- Nov 19: the Journal bank was 336 one-sentence pieces, one per event. A bank of single lines can't tell a week; the planner groups events into a paragraph, and the lines are written to sit together.
- Oct 1: he had asked "multiple times" for the Journal to read as a story. A list of dated "I did this." lines is engine output, not a game.
